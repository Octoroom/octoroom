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

async function findProperty() {
  const address = '110 Tihi Street';
  console.log(`正在查找地址包含 "${address}" 的房源...`);

  const { data, error } = await supabaseAdmin
    .from('octo_properties')
    .select('id, title, address_name, author_id')
    .ilike('address_name', `%${address}%`);

  if (error) {
    console.error("查找失败:", error);
    return;
  }

  if (data && data.length > 0) {
    console.log("找到以下房源:");
    data.forEach(p => {
      console.log(`ID: ${p.id}, Title: ${p.title}, Address: ${p.address_name}, Current Author: ${p.author_id}`);
    });
  } else {
    console.log("未找到匹配的房源。");
  }
}

findProperty();
