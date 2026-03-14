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
    const { templateId, propertyId, buyerName, buyerEmail, buyerId, offerTerms } = body;

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

    // 构造跳转回我们隐形 API 的 URL
    const successRedirectUrl = `${origin}/api/signwell/success?property_id=${propertyId}&buyer_id=${buyerId}`;
    const sellerSuccessUrl = `${origin}/api/signwell/seller-success?property_id=${propertyId}&buyer_id=${buyerId}`;

    const payload = {
      test_mode: true,
      template_id: templateId, 
      name: `Octoroom S&P 协议 - 房源 ${propertyId}`,
      embedded_signing: true,
      embedded_signing_notifications: true,
      external_id: propertyId,
      
      // ⚠️ 最外层的 redirect_url 已经彻底移除，解决多方签署拦截问题！

      recipients: [
        { 
          id: 'buyer_id', 
          placeholder_name: 'buyer', 
          name: buyerName, 
          email: buyerEmail,
          // 🌟 核心绝招：把跳转链接精准绑定在买家身上！
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
      
      // 🌟 根据前端传入的表单数据，动态填入 SignWell Template 中对应的 API IDs 
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
    const buyerSignUrl = data.recipients?.find((r: any) => r.id === 'buyer_id')?.embedded_signing_url;

    return NextResponse.json({ signUrl: buyerSignUrl, documentId: data.id });
  } catch (error: any) {
    return NextResponse.json({ error: "服务器内部代码错误: " + error.message }, { status: 500 });
  }
}