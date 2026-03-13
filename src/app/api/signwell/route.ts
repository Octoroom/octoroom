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
    
    // 🌟 新增：获取动态的网站根域名 (本地是 localhost, 线上是 octoroom.com)
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!process.env.SIGNWELL_API_KEY) {
       return NextResponse.json({ error: "服务器未能读取到 API Key" }, { status: 500 });
    }

    // 🌟 接收多传过来的 buyerId
    const { templateId, propertyId, buyerName, buyerEmail, buyerId } = body;

    const { data: property, error: pError } = await supabaseAdmin
      .from('octo_properties')
      .select('author_id, author_name')
      .eq('id', propertyId)
      .single();

    if (pError || !property) {
      return NextResponse.json({ error: "在数据库中找不到该房源或对应的发布者信息" }, { status: 404 });
    }

    const { data: authData, error: aError } = await supabaseAdmin.auth.admin.getUserById(property.author_id);

    if (aError || !authData.user || !authData.user.email) {
      return NextResponse.json({ error: `系统无法调取卖家 [${property.author_name}] 的注册邮箱。` }, { status: 404 });
    }

    const sellerEmail = authData.user.email;
    const sellerName = property.author_name || "房东";

    const payload = {
      test_mode: true,
      template_id: templateId, 
      name: `Octoroom S&P 协议 - 房源 ${propertyId}`,
      embedded_signing: true,
      embedded_signing_notifications: true,
      external_id: propertyId,
      
      // 🌟 核心绝招：让 SignWell 签完字后跳到我们新建的 API
      // 并把 property_id 和 buyer_id 带过去
      redirect_url: `${origin}/api/signwell/success?property_id=${propertyId}&buyer_id=${buyerId}`,

      recipients: [
        { id: 'buyer_id', placeholder_name: 'buyer', name: buyerName, email: buyerEmail },
        { id: 'seller_id', placeholder_name: 'seller', name: sellerName, email: sellerEmail }
      ]
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