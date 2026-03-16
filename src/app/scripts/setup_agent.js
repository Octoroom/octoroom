const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envPath = path.resolve(process.cwd(), '../../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/^"|"$/g, '');
    }
  });
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupAgent() {
  const email = 'jonasfub@gmail.com'; // Updated target
  console.log(`正在为 ${email} 设置 AGENT 角色...`);

  // 1. 获取用户 ID
  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (listError) {
    console.error("获取用户列表失败:", listError);
    return;
  }

  const targetUser = users.users.find(u => u.email === email);
  
  if (!targetUser) {
    console.log(`未找到用户 ${email}，请确保该用户已经注册。`);
    return;
  }

  const userId = targetUser.id;
  console.log(`找到用户 ${email}, UUID: ${userId}`);

  // 2. 更新 profiles 表
  const profileData = {
    id: userId,
    role: 'AGENT',
    full_name: 'NZ Property Agent',
    username: 'agent_ritpol',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Agent1'
  };

  const { error: profileError } = await supabaseAdmin.from('profiles').upsert(profileData);

  if (profileError) {
    console.error("更新 profiles 失败:", profileError);
  } else {
    console.log(`✅ 成功为 ${email} 设置角色为 'AGENT'！`);
  }

  // 3. 同时更新 metadata (可选，用于前后端一致性)
  const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { role: 'AGENT' }
  });

  if (metaError) {
    console.error("更新 Auth Metadata 失败:", metaError);
  } else {
    console.log("✅ Auth Metadata 同步更新成功。");
  }
}

setupAgent();
