// src/app/api/signwell/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 🌟 初始化拥有最高权限的 Supabase Admin 客户端
// 注意：确保你的 .env.local 中已经配置了 SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("1. 收到前端发来的基础数据:", body);

    if (!process.env.SIGNWELL_API_KEY) {
       return NextResponse.json({ error: "服务器未能读取到 API Key" }, { status: 500 });
    }

    const { templateId, propertyId, buyerName, buyerEmail } = body;

    console.log(`2. 正在查询房源 [${propertyId}] 的发布者信息...`);
    
    // 🌟 第一步：通过房源 ID，去 octo_properties 表拿到 author_id
    const { data: property, error: pError } = await supabaseAdmin
      .from('octo_properties')
      .select('author_id, author_name')
      .eq('id', propertyId)
      .single();

    if (pError || !property) {
      console.error("获取房源作者失败:", pError);
      return NextResponse.json({ error: "在数据库中找不到该房源或对应的发布者信息" }, { status: 404 });
    }

    console.log(`3. 正在穿越 Auth 系统，调取卖家(ID: ${property.author_id})的注册邮箱...`);

    // 🌟 第二步：使用 Admin 权限，直接从 Supabase Auth 核心系统抓取邮箱
    const { data: authData, error: aError } = await supabaseAdmin.auth.admin.getUserById(property.author_id);

    if (aError || !authData.user || !authData.user.email) {
      console.error("获取卖家邮箱失败:", aError);
      return NextResponse.json({ error: `系统无法调取卖家 [${property.author_name}] 的注册邮箱。` }, { status: 404 });
    }

    const sellerEmail = authData.user.email;
    const sellerName = property.author_name || "房东";

    console.log(`✅ 成功锁定卖家！姓名: ${sellerName}, 邮箱: ${sellerEmail}`);

    // ==========================================
    // 🌟 终极无敌正确版 Payload：id 和 placeholder_name 双管齐下！
    // ==========================================
    const payload = {
      test_mode: true,
      template_id: templateId, 
      name: `Octoroom S&P 协议 - 房源 ${propertyId}`,
      embedded_signing: true,
      embedded_signing_notifications: true,
      // 🌟 核心新增：把房源 ID 作为“外部关联ID”传给 SignWell
      // 这样 Webhook 回调的时候，我们就能原封不动地收到这个 ID
      external_id: propertyId,

      recipients: [
        {
          id: 'buyer_id', 
          placeholder_name: 'buyer', 
          name: buyerName,
          email: buyerEmail
        },
        {
          id: 'seller_id', 
          placeholder_name: 'seller', 
          name: sellerName,
          email: sellerEmail // 这里的邮箱已经是后端强行抓取到的绝对正确的邮箱
        }
      ]
    };

    console.log("4. 准备发送给 SignWell，正在请求...");

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
    console.log("5. SignWell 返回的原始数据:", textData);

    if (!response.ok) {
       return NextResponse.json({ error: `SignWell 拒绝了请求: ${textData}` }, { status: 500 });
    }

    const data = JSON.parse(textData);
    
    // 🌟 提取买家和卖家的嵌入式签名链接
    const buyerSignUrl = data.recipients?.find((r: any) => r.id === 'buyer_id')?.embedded_signing_url;
    const sellerSignUrl = data.recipients?.find((r: any) => r.id === 'seller_id')?.embedded_signing_url;

    console.log("✅ 成功拿到链接！返回给前端...");

    return NextResponse.json({
      signUrl: buyerSignUrl,
      documentId: data.id,
      sellerSignUrl: sellerSignUrl
    });

  } catch (error: any) {
    console.error("❌ 后端代码执行意外崩溃:", error);
    return NextResponse.json({ error: "服务器内部代码错误: " + error.message }, { status: 500 });
  }
}