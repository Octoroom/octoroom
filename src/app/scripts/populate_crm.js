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

async function populateCRM() {
  const agentEmail = 'jonasfub@gmail.com';
  console.log(`正在为代理商 ${agentEmail} 录入数据...`);

  // 1. 获取代理商 ID
  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error("获取用户列表失败:", listError);
    return;
  }

  const agent = users.users.find(u => u.email === agentEmail);
  if (!agent) {
    console.error(`未找到代理商 ${agentEmail}，请确保该账号已存在。`);
    return;
  }
  const agentId = agent.id;

  // 2. 准备数据
  const contacts = [
    { agent_id: agentId, name: 'James Wilson', email: 'james.wilson@example.com', phone: '021 888 777', type: 'BUYER', status: 'WORKING', address: 'Remuera, Auckland' },
    { agent_id: agentId, name: 'Sarah Jenkins', email: 's.jenkins@example.com', phone: '022 345 678', type: 'BUYER', status: 'WORKING', address: 'Ponsonby, Auckland' },
    { agent_id: agentId, name: 'Michael Chen', email: 'm.chen@investor.com', phone: '027 111 222', type: 'BUYER', status: 'WORKING', address: 'Albany, Auckland' },
    { agent_id: agentId, name: 'Emily Brown', email: 'emily.b@example.com', phone: '021 999 000', type: 'BUYER', status: 'PENDING', address: 'Stonefields, Auckland' },
    { agent_id: agentId, name: 'David Thompson', email: 'd.thompson@example.com', phone: '021 555 444', type: 'BUYER', status: 'DONE', address: 'Epsom, Auckland' },
    { agent_id: agentId, name: 'Ritpol Seller', email: 'ritpol@hotmail.com', phone: '021 000 111', type: 'SELLER', status: 'WORKING', address: '110 Tihi Street, Stonefields' }
  ];

  console.log(`准备插入 ${contacts.length} 条记录...`);

  // 3. 插入数据
  const { data, error } = await supabaseAdmin
    .from('crm_contacts')
    .insert(contacts)
    .select();

  if (error) {
    if (error.code === '42P01') {
      console.error("❌ 错误: crm_contacts 表不存在。请先在 Supabase SQL Editor 中运行建表脚本。");
    } else {
      console.error("❌ 插入数据失败:", error);
    }
  } else {
    console.log(`✅ 成功录入 ${data.length} 条客户信息！`);
    data.forEach(c => console.log(` - [${c.type}] ${c.name} (${c.email})`));
  }
}

populateCRM();
