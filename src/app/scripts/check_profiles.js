const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../../../.env.local');
const env = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').filter(Boolean).forEach(l => {
    const [k, v] = l.split('=');
    if (k && v) env[k.trim()] = v.trim().replace(/^['\"]|['\"]$/g, '');
  });
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
  console.log('--- 🔍 Checking Profiles Schema ---');
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) {
    console.error('Error fetching profiles:', error);
  } else if (data && data[0]) {
    console.log('Profiles columns:', Object.keys(data[0]));
  } else {
    console.log('No profiles found.');
  }

  console.log('\n--- 🔍 Checking for Jerry ---');
  const { data: jerry } = await supabase.from('profiles').select('*').ilike('username', '%Jerry%');
  console.log('Jerry profile record:', JSON.stringify(jerry, null, 2));
}

checkSchema();
