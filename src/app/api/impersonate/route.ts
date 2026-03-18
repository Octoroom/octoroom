import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    // 1. 使用 Service Role Key 初始化最高权限的客户端
    // ⚠️ 注意：确保你的 .env.local 或线上环境变量中已经配置了 SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 2. 查出目标用户的真实邮箱
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
    if (userError || !user?.user?.email) {
      return NextResponse.json({ error: '找不到该用户或该用户无邮箱' }, { status: 400 });
    }

    // 🌟 3. 设定一个统一的测试账号密码
    // 你可以随时在这里修改为你想要的任何复杂密码
    const TEST_PASSWORD = 'OctoroomTest888!';

    // 🌟 4. 强行将该测试账号的密码更新为这个固定密码
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { password: TEST_PASSWORD }
    );

    if (updateError) throw updateError;

    // 🌟 5. 将邮箱和密码返回给前端，让前端正常走“账号+密码”的登录流程
    return NextResponse.json({ 
      email: user.user.email,
      password: TEST_PASSWORD 
    });
    
  } catch (error: any) {
    console.error('Impersonate API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}