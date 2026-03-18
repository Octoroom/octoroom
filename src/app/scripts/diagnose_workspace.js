const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.resolve(__dirname, '../../../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=');
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/^['"]|['"]$/g, '');
    }
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnose() {
  console.log("--- Agent Workspace Diagnosis ---");
  
  // 1. Get current user ( Jonas )
  const { data: users } = await supabase.auth.admin.listUsers();
  const jonas = users.users.find(u => u.email === 'jonasfub@gmail.com');
  
  if (!jonas) {
    console.log("Error: User jonasfub@gmail.com not found.");
    return;
  }
  
  console.log(`Current Agent: ${jonas.email} (ID: ${jonas.id})`);

  // 2. Check properties for this agent
  const { data: props } = await supabase
    .from('octo_properties')
    .select('*')
    .eq('author_id', jonas.id);
  
  console.log(`Properties found for this agent: ${props ? props.length : 0}`);
  if (props && props.length > 0) {
    props.forEach(p => console.log(` - ${p.id}: ${p.address_name || p.title}`));
  }

  // 3. Check all properties to see what's available
  const { data: allProps } = await supabase.from('octo_properties').select('id, title, author_id, address_name').limit(5);
  console.log("\nSample of all properties in DB:");
  allProps.forEach(p => console.log(` - ${p.id} | Author: ${p.author_id} | Adr: ${p.address_name || p.title}`));

  // 4. Check CRM Sellers
  const { data: sellers } = await supabase
    .from('crm_contacts')
    .select('*')
    .eq('agent_id', jonas.id)
    .eq('type', 'SELLER');
  
  console.log(`\nCRM Sellers found for this agent: ${sellers ? sellers.length : 0}`);
  if (sellers && sellers.length > 0) {
    sellers.forEach(s => console.log(` - ${s.name} | Adr: ${s.address}`));
  }
}

diagnose();
