import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 初始化管理员权限的 Supabase
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  // 1. 获取 URL 中的参数
  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get('property_id');
  const buyerId = searchParams.get('buyer_id');
  const agentId = searchParams.get('agent_id');
  
  // SignWell 自动追加的文档 ID 参数
  const documentId = searchParams.get('document_id') || 'unknown'; 

  if (!propertyId || !buyerId) {
    return new NextResponse("缺少必要的参数", { status: 400 });
  }

  try {
    // 2. 检查是否已经存在这条 Offer（防止买家刷新页面重复插入）
    const { data: existingOffer } = await supabaseAdmin
      .from('octo_offers')
      .select('id')
      .eq('property_id', propertyId)
      .eq('buyer_id', buyerId)
      .single();

    // 3. 只有不存在时，才插入新的 Offer
    if (!existingOffer) {
      const { error } = await supabaseAdmin.from('octo_offers').insert({
        property_id: propertyId,
        buyer_id: buyerId,
        signwell_doc_id: documentId,
        status: 'pending_seller_signature' // 状态：等待房东签字
      });

      if (error) throw error;
      console.log(`✅ 成功录入买家 [${buyerId}] 对房源 [${propertyId}] 的 Offer！`);
    } else {
      // 🌟 如果已经存在（例如 Agent 预先创建的），则更新其状态和 doc_id
      const { error } = await supabaseAdmin
        .from('octo_offers')
        .update({ 
          status: 'pending_seller_signature',
          signwell_doc_id: documentId 
        })
        .match({ id: existingOffer.id });
        
      if (error) throw error;
      console.log(`✅ 成功更新已有 Offer [${existingOffer.id}] 状态为待卖家签署！`);
    }

    // 3.5 🌟 通知代理/卖家：买家已签署协议
    const { data: prop } = await supabaseAdmin
      .from('octo_properties')
      .select('author_id')
      .eq('id', propertyId)
      .single();
    
    if (prop) {
      await supabaseAdmin.from('notifications').insert({
        receiver_id: agentId || prop.author_id,
        actor_id: buyerId,
        type: 'offer_signed_buyer',
        content: '买家已完成签署，等待中介确认',
        reference_id: propertyId,
        is_read: false
      });
    }

    // 4. 🌟 返回一段自动关闭弹窗的 HTML！
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
        <head><title>签署完成</title></head>
        <body style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; background: #F8F9FB;">
          <div style="text-align: center;">
            <h2 style="color: #10B981;">签署完成！正在同步数据...</h2>
            <p style="color: #6B7280;">此窗口将自动关闭</p>
          </div>
          <script>
            // 延迟 1 秒后自动关闭当前小弹窗
            setTimeout(() => {
              window.close();
            }, 1000);
          </script>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  } catch (error: any) {
    console.error("❌ 插入 Offer 失败:", error);
    return new NextResponse(`内部错误: ${error.message}`, { status: 500 });
  }
}
