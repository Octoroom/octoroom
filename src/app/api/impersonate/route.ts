import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { targetUserId } = await request.json();

    // 1. 使用 Service Role Key 初始化最高权限的 Supabase 客户端
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 2. 查出目标用户的真实邮箱
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
    if (userError || !user?.user?.email) {
      return NextResponse.json({ error: '找不到该用户或用户无邮箱' }, { status: 400 });
    }

    // 3. 强行生成一条免密魔法链接 (Magic Link)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.user.email,
    });

    if (linkError) throw linkError;

    // 4. 将链接返回给前端
    return NextResponse.json({ link: linkData.properties.action_link });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}