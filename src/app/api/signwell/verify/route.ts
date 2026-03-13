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

    // 1. 去 SignWell 官方 API 查这个合同的真实状态
    const swResponse = await fetch(`https://www.signwell.com/api/v1/documents/${documentId}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': process.env.SIGNWELL_API_KEY!,
        'Accept': 'application/json'
      }
    });

    const docData = await swResponse.json();

    // 打印一下真实的返回数据，方便咱们在 Vercel 日志里看
    console.log("🔍 SignWell 查岗数据返回，文档状态:", docData.status);

    // 2. 🌟 核心修复：不用 id 找人，用 placeholder_name 找咱们的买家
    const buyer = docData.recipients?.find((r: any) => r.placeholder_name === 'buyer');
    
    // 如果没找到买家，或者买家的状态既不是 signed 也不是 completed，说明还没签完
    if (!buyer || (buyer.status !== 'signed' && buyer.status !== 'completed')) {
      console.log("⏳ 买家尚未签字，当前状态:", buyer?.status || '未找到买家');
      return NextResponse.json({ signed: false });
    }

    console.log("✅ 买家已签字！准备写入数据库...");

    // 3. 检查数据库是否已经有记录 (防止买家疯狂点按钮导致重复插入)
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
      console.log(`🎉 主动验证成功！录入买家 [${buyerId}] 的 Offer！`);
    }

    return NextResponse.json({ signed: true });

  } catch (error: any) {
    console.error("❌ 验证签名失败:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}