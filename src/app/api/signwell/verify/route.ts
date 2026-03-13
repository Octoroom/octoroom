import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { documentId, propertyId, buyerId } = await request.json();

    if (!documentId || !propertyId || !buyerId) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    // 🌟 1. 核心大招：先通过 buyerId 拿到买家的真实邮箱 (这是唯一绝对不变的凭证)
    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(buyerId);
    const buyerEmail = authData.user?.email;

    if (!buyerEmail) {
       return NextResponse.json({ error: "系统无法获取当前买家的验证邮箱" }, { status: 400 });
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

    // 打印全量收件人数据，以防万一
    console.log("🔍 SignWell 完整收件人列表:", JSON.stringify(docData.recipients));

    // 3. 🌟 终极绝杀：不用 ID，直接用邮箱去找我们的买家！
    const buyer = docData.recipients?.find((r: any) => r.email === buyerEmail);
    
    // 如果没找到，或者状态还没签完
    if (!buyer || (buyer.status !== 'signed' && buyer.status !== 'completed')) {
      console.log(`⏳ 邮箱为 [${buyerEmail}] 的买家尚未签字，当前状态:`, buyer?.status || '未找到该邮箱');
      return NextResponse.json({ signed: false });
    }

    console.log("✅ 成功匹配买家邮箱，确认已签字！准备写入数据库...");

    // 4. 检查数据库是否已经有记录 (防止重复插入)
    const { data: existingOffer } = await supabaseAdmin
      .from('octo_offers')
      .select('id')
      .eq('property_id', propertyId)
      .eq('buyer_id', buyerId)
      .single();

    if (!existingOffer) {
      // 插入新 Offer
      const { error } = await supabaseAdmin.from('octo_offers').insert({
        property_id: propertyId,
        buyer_id: buyerId,
        signwell_doc_id: documentId,
        status: 'pending_seller_signature'
      });
      if (error) throw error;
      console.log(`🎉 写入成功！Offer 状态已更新！`);
    }

    return NextResponse.json({ signed: true });

  } catch (error: any) {
    console.error("❌ 验证签名失败:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}