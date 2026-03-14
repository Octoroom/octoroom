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
  
  if (!propertyId || !buyerId) {
    return new NextResponse("缺少必要的参数", { status: 400 });
  }

  try {
    // 2. 更新 Offer 的状态为已接受
    const { error } = await supabaseAdmin
      .from('octo_offers')
      .update({ status: 'accepted' })
      .match({ property_id: propertyId, buyer_id: buyerId });

    if (error) throw error;
    console.log(`✅ 成功将买家 [${buyerId}] 对房源 [${propertyId}] 的 Offer 更新为 accepted！`);

    // 3. 返回一段自动关闭弹窗的 HTML！
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
        <head><title>签署完成</title></head>
        <body style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif; background: #F8F9FB;">
          <div style="text-align: center;">
            <h2 style="color: #10B981;">签署完成！您已接受该出价。</h2>
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
    console.error("❌ 更新 Offer 状态失败:", error);
    return new NextResponse(`内部错误: ${error.message}`, { status: 500 });
  }
}
