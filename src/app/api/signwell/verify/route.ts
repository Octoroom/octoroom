import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { documentId, propertyId, buyerId: userId, agentId, isSeller, offerTerms } = await request.json();

    if (!documentId || !propertyId || !userId) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    // 2. 去 SignWell 官方 API 查这个合同的真实状态
    const swResponse = await fetch(`https://www.signwell.com/api/v1/documents/${documentId}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': process.env.SIGNWELL_API_KEY!,
        'Accept': 'application/json'
      }
    });

    const docData = await swResponse.json();

    // 3. 核心大招：根据身份匹配签署人
    const roleId = isSeller ? 'seller_id' : 'buyer_id';
    const signer = docData.recipients?.find((r: any) => r.id === roleId);
    
    // 如果没找到，或者状态还没签完
    if (!signer || (signer.status !== 'signed' && signer.status !== 'completed')) {
      console.log(`⏳ 身份为 [${roleId}] 的用户尚未签字，当前状态:`, signer?.status || '未找到');
      return NextResponse.json({ signed: false });
    }

    console.log(`✅ 成功匹配身份为 [${roleId}] 的签署人，确认已签字！准备写入/更新数据库...`);

    // 4. 检查数据库是否已经有记录 (防止重复插入或更新)
    if (!isSeller) {
      const { data: existingOffer } = await supabaseAdmin
        .from('octo_offers')
        .select('id')
        .eq('property_id', propertyId)
        .eq('buyer_id', userId)
        .single();

      if (!existingOffer) {
        // 插入新 Offer，并包含所有的 S&P 详细条款
        const insertData: any = {
          property_id: propertyId,
          buyer_id: userId,
          signwell_doc_id: documentId,
          status: 'pending_seller_signature'
        };

        if (offerTerms) {
          insertData.legal_buyer_name = offerTerms.purchaserName || null;
          insertData.buyer_address = offerTerms.buyerAddress || null;
          insertData.contact_number = offerTerms.contactNumber || null;
          insertData.buyer_lawyer_id = offerTerms.buyerLawyerId || null;
          insertData.buyer_lawyer_name = offerTerms.buyerLawyerName || null;
          insertData.buyer_lawyer_address = offerTerms.buyerLawyerAddress || null;
          insertData.buyer_lawyer_contact = offerTerms.buyerLawyerContact || null;
          insertData.offer_price = offerTerms.offerPrice || null;
          insertData.finance_type = offerTerms.financeType || 'cash';
          insertData.finance_days = offerTerms.financeDays || 0;
          insertData.deposit = offerTerms.deposit || 0;
          insertData.settlement_date = offerTerms.settlementDate || null;
          insertData.conditions = offerTerms.conditions || null;
        }

        const { error } = await supabaseAdmin.from('octo_offers').insert(insertData);
        if (error) throw error;
      } else {
        // 🌟 如果已经存在（例如 Agent 预先创建的），则更新其状态
        const { error } = await supabaseAdmin
          .from('octo_offers')
          .update({ 
            status: 'pending_seller_signature',
            signwell_doc_id: documentId 
          })
          .match({ id: existingOffer.id });
          
        if (error) throw error;
      }

      const { data: prop } = await supabaseAdmin
        .from('octo_properties')
        .select('author_id')
        .eq('id', propertyId)
        .single();

      const notificationReceiverId = agentId || prop?.author_id;
      if (notificationReceiverId) {
        const { data: existingNotif } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('receiver_id', notificationReceiverId)
          .eq('actor_id', userId)
          .eq('type', 'offer_signed_buyer')
          .eq('reference_id', propertyId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!existingNotif) {
          await supabaseAdmin.from('notifications').insert({
            receiver_id: notificationReceiverId,
            actor_id: userId,
            type: 'offer_signed_buyer',
            content: '买家已完成签署，等待中介确认',
            reference_id: propertyId,
            metadata: existingOffer ? { offer_id: existingOffer.id } : {},
            is_read: false
          });
        }
      }
    } else {
      // 卖家的话，更新状态为 accepted
      const { data: updatedOffer, error } = await supabaseAdmin
        .from('octo_offers')
        .update({ status: 'accepted' })
        .match({ signwell_doc_id: documentId })
        .select('id, property_id, buyer_id')
        .maybeSingle();

      if (error) throw error;

      if (updatedOffer) {
        // 🌟 通知代理商：卖家已签署
        const { data: prop } = await supabaseAdmin
          .from('octo_properties')
          .select('author_id')
          .eq('id', updatedOffer.property_id)
          .single();

        if (prop) {
          await supabaseAdmin.from('notifications').insert({
            receiver_id: agentId || prop.author_id,
            actor_id: userId, // 这里的 userId 是卖家
            type: 'offer_signed_seller',
            content: '卖家已接受并签署，交易合意达成！',
            reference_id: updatedOffer.property_id,
            metadata: { offer_id: updatedOffer.id },
            is_read: false
          });
        }
      }
    }

    return NextResponse.json({ signed: true });

  } catch (error: any) {
    console.error("❌ 验证签名失败:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
