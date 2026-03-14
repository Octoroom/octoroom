const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createLawyer() {
  console.log("正在创建律师测试账号 Jessica Chen...");

  // 1. Create User Auth
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email: 'jessica.chen.law@octoroom.com',
    password: 'Password123!',
    email_confirm: true,
    user_metadata: {
      full_name: 'Jessica Chen',
      role: 'LAWYER'
    }
  });

  if (userError) {
    if (userError.message.includes('already registered')) {
        console.log("该测试邮箱已被注册。将尝试获取该用户 ID...");
    } else {
        console.error("创建 Auth 账号失败:", userError);
        return;
    }
  }

  // Get user ID
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const jessica = users.users.find(u => u.email === 'jessica.chen.law@octoroom.com');
  
  if (!jessica) {
    console.error("未能找到或创建 Auth UUID。");
    return;
  }

  console.log(`获取到 jessica UUID: ${jessica.id}`);

  // 2. Insert/Upsert Profile with role = 'LAWYER'
  const profileData = {
    id: jessica.id,
    username: 'jessicachen',
    full_name: 'Jessica Chen',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=250&h=250',
    bio: '资深房产律师 | Chen & Associates',
    role: 'LAWYER'
  };

  const { error: profileError } = await supabaseAdmin.from('profiles').upsert(profileData);

  if (profileError) {
    console.error("插入/更新 profiles 失败:", profileError);
  } else {
    console.log("✅ 成功创建并在 profiles 表中注入 Jessica Chen 的各项档案信息，并且 role 已设置为 'LAWYER'！");
  }
}

createLawyer();
