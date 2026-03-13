import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 初始化管理员权限的 Supabase
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // 1. 解析 SignWell 发来的 Webhook 数据包
    const event = await request.json();
    console.log(`🔔 收到 SignWell Webhook 事件: ${event.type}`);

    // 2. 我们只关心 "所有人都签完了" 这个终极事件
    if (event.type === 'document_completed') {
      const document = event.data;
      
      // 取出我们在生成合同时埋下的暗号 (房源 ID)
      const propertyId = document.external_id;

      if (!propertyId) {
         console.error("❌ 找不到关联的房源 ID");
         return NextResponse.json({ error: '缺失 external_id' }, { status: 400 });
      }

      console.log(`🎉 房源 [${propertyId}] 的合同已全部签署完毕！正在更新数据库...`);

      // 3. 🌟 更新 Supabase 数据库
      // 将该房源的状态从 'active' 改为 'sold' (或者 'under_contract')
      const { error } = await supabaseAdmin
        .from('octo_properties')
        .update({ status: 'sold' }) // 请根据你的实际业务状态字段修改
        .eq('id', propertyId);

      if (error) {
        console.error("❌ 数据库更新失败:", error);
        throw error;
      }

      console.log("✅ 数据库状态已更新为已售出 (Sold)!");
    }

    // 🌟 核心规矩：无论处理结果如何，必须快速返回 200 OK 给 SignWell。
    // 否则 SignWell 会认为你的服务器挂了，并在接下来几天里疯狂重试发送。
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Webhook 严重错误:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}