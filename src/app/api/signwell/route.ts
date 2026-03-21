// src/app/api/signwell/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { templateId, propertyId, buyerName, buyerEmail, buyerId, agentId, offerTerms, isAgentDrafting, isAmendment, offerId } = body;

    if (!templateId || !propertyId || !buyerName || !buyerEmail || !buyerId) {
      return NextResponse.json({ error: "请求参数不完整，缺少买家或房源信息" }, { status: 400 });
    }
    
    // 🌟 获取动态的网站根域名
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://octoroom.com';

    if (!process.env.SIGNWELL_API_KEY) {
       return NextResponse.json({ error: "服务器未能读取到 API Key" }, { status: 500 });
    }

    const { data: property, error: pError } = await supabaseAdmin
      .from('octo_properties')
      .select('author_id, author_name, address_name')
      .eq('id', propertyId)
      .single();

    if (pError || !property) {
      return NextResponse.json({ error: "在数据库中找不到该房源或对应的发布者信息" }, { status: 404 });
    }

    const { data: authData, error: aError } = await supabaseAdmin.auth.admin.getUserById(property.author_id);

    if (aError || !authData.user || !authData.user.email) {
      return NextResponse.json({ error: `系统无法调取卖家 [${property.author_name}] 的注册邮箱。` }, { status: 404 });
    }

    const rawSellerEmail = authData.user.email;
    const sellerEmail = rawSellerEmail === buyerEmail ? rawSellerEmail.replace('@', '+seller@') : rawSellerEmail;
    const sellerName = property.author_name || "房东";

    // --- 🔍 关键修复：根据邮箱查询真实的买家用户 ID ---
    // 从 frontend 传来的 buyerId 可能是 CRM ID，我们需要找到真正的 Auth UUID 以便通知和展示
    let resolvedBuyerId = buyerId;
    try {
      // 🌟 Enhanced resolution: Try Profile lookup first (fast & reliable)
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', buyerEmail)
        .maybeSingle();

      if (profile) {
        resolvedBuyerId = profile.id;
        console.log(`Resolved buyer ID for ${buyerEmail} via Profiles: ${resolvedBuyerId}`);
      } else {
        // Fallback: Check Auth directly if Profile doesn't exist yet
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const actualUser = users.find(u => u.email?.toLowerCase() === buyerEmail?.toLowerCase());
        if (actualUser) {
          resolvedBuyerId = actualUser.id;
          console.log(`Resolved buyer ID for ${buyerEmail} via Auth: ${resolvedBuyerId}`);
        } else {
          console.warn(`Could not find Auth User or Profile for email: ${buyerEmail}. Falling back to provided buyerId: ${buyerId}`);
        }
      }
    } catch (err) {
      console.error("Error resolving buyer ID from email:", err);
    }

    // 构造跳转回我们隐形 API 的 URL (始终使用 Auth UUID)
    const successRedirectUrl = `${origin}/api/signwell/success?property_id=${propertyId}&buyer_id=${resolvedBuyerId}${agentId ? `&agent_id=${agentId}` : ''}`;
    const sellerSuccessUrl = `${origin}/api/signwell/seller-success?property_id=${propertyId}&buyer_id=${resolvedBuyerId}`;

    const payload = {
      test_mode: true,
      template_id: templateId, 
      name: `Octoroom S&P 协议 - 房源 ${propertyId}`,
      embedded_signing: true, // 🌟 Always use embedded signing
      embedded_signing_notifications: true, // 🌟 Always send email notifications
      external_id: propertyId,
      
      recipients: [
        { 
          id: 'buyer_id', 
          placeholder_name: 'buyer', 
          name: buyerName, 
          email: buyerEmail,
          redirect_url: successRedirectUrl 
        },
        { 
          id: 'seller_id', 
          placeholder_name: 'seller', 
          name: sellerName, 
          email: sellerEmail,
          redirect_url: sellerSuccessUrl
        }
      ],
      
      ...(offerTerms && {
        template_fields: [
          { api_id: 'property_address', value: property.address_name || '' },
          { api_id: 'legal_buyer_name', value: offerTerms.purchaserName || '' },
          { api_id: 'legal_buyer_name_2', value: offerTerms.purchaserName || '' },
          { api_id: 'legal_buyer_name_3', value: offerTerms.purchaserName || '' },
          { api_id: 'buyer_address', value: offerTerms.buyerAddress || '' },
          { api_id: 'contact_number', value: offerTerms.contactNumber || '' },
          { api_id: 'buyer_lawyer_name', value: offerTerms.buyerLawyerName || '' },
          { api_id: 'buyer_lawyer_address', value: offerTerms.buyerLawyerAddress || '' },
          { api_id: 'buyer_lawyer_contact', value: offerTerms.buyerLawyerContact || '' },
          { api_id: 'offer_price', value: offerTerms.offerPrice ? `$${offerTerms.offerPrice.toLocaleString()}` : '' },
          { api_id: 'deposit_percent', value: offerTerms.deposit ? `${offerTerms.deposit}%` : '' },
          { api_id: 'settlement_date', value: offerTerms.settlementDate || '' },
          { api_id: 'finance_days', value: offerTerms.financeType === 'finance' ? `${offerTerms.financeDays} Days` : 'N/A' },
          { api_id: 'lim_days', value: offerTerms.conditions?.lim ? `${offerTerms.conditions.lim} Days` : 'N/A' },
          { api_id: 'building_days', value: offerTerms.conditions?.building ? `${offerTerms.conditions.building} Days` : 'N/A' },
          { api_id: 'tox_days', value: offerTerms.conditions?.toxicology ? `${offerTerms.conditions.toxicology} Days` : 'N/A' }
        ]
      })
    };

    const response = await fetch('https://www.signwell.com/api/v1/document_templates/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': process.env.SIGNWELL_API_KEY,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const textData = await response.text();
    if (!response.ok) return NextResponse.json({ error: `SignWell 拒绝了请求: ${textData}` }, { status: 500 });

    const data = JSON.parse(textData);

    // If it's an agent drafting, we persist the offer and update CRM status immediately
    if (isAgentDrafting) {
      // 1. Create the offer record
      const offerData: any = {
        property_id: propertyId,
        buyer_id: resolvedBuyerId, // Use Auth UUID
        signwell_doc_id: data.id,
        status: 'pending_buyer_signature'
      };

      if (offerTerms) {
        offerData.legal_buyer_name = offerTerms.purchaserName || null;
        offerData.buyer_address = offerTerms.buyerAddress || null;
        offerData.contact_number = offerTerms.contactNumber || null;
        offerData.buyer_lawyer_id = offerTerms.buyerLawyerId || null;
        offerData.buyer_lawyer_name = offerTerms.buyerLawyerName || null;
        offerData.buyer_lawyer_address = offerTerms.buyerLawyerAddress || null;
        offerData.buyer_lawyer_contact = offerTerms.buyerLawyerContact || null;
        offerData.offer_price = offerTerms.offerPrice || null;
        offerData.finance_type = offerTerms.financeType || 'cash';
        offerData.finance_days = offerTerms.financeDays || 0;
        offerData.deposit = offerTerms.deposit || 0;
        offerData.settlement_date = offerTerms.settlementDate || null;
        offerData.conditions = offerTerms.conditions || null;
      }

      let targetOfferId = offerId;

      if (isAmendment && offerId) {
        const { error: offerError } = await supabaseAdmin
          .from('octo_offers')
          .update(offerData)
          .eq('id', offerId);
          
        if (offerError) {
          console.error("Error updating offer:", offerError);
          return NextResponse.json({ error: "无法更新报价记录: " + offerError.message }, { status: 500 });
        }
      } else {
        const { data: newOffer, error: offerError } = await supabaseAdmin
          .from('octo_offers')
          .insert(offerData)
          .select('id')
          .single();

        if (offerError) {
          console.error("Error inserting offer:", offerError);
          return NextResponse.json({ error: "无法创建报价记录: " + offerError.message }, { status: 500 });
        }
        targetOfferId = newOffer.id;
      }

      // 2. Create in-app notification for the buyer
      const notifType = isAmendment ? 'offer_amended' : 'offer';
      const notifContent = isAmendment ? '合同需要修改， 请买家确认' : '为你准备了一份购房协议，请确认并签署';

      await supabaseAdmin.from('notifications').insert({
        receiver_id: resolvedBuyerId,
        actor_id: agentId || property.author_id,
        type: notifType,
        content: notifContent,
        reference_id: propertyId,
        metadata: { offer_id: targetOfferId }, // 🚀 CRITICAL: Link to the specific offer
        is_read: false
      });

      // 3. Update CRM contact status
      // We use buyerId here as it's the CRM contact ID in the context of agent drafting
      await supabaseAdmin.from('crm_contacts').update({ status: 'DONE' }).eq('id', buyerId);

      return NextResponse.json({ success: true, documentId: data.id });
    }

    const buyerSignUrl = data.recipients?.find((r: any) => r.id === 'buyer_id')?.embedded_signing_url;

    return NextResponse.json({ signUrl: buyerSignUrl, documentId: data.id });
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部代码错误: " + error.message }, { status: 500 });
  }
}
