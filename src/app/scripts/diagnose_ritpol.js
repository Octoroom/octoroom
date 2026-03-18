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

async function diagnose() {
  console.log('--- 🔍 Diagnosing Ritpol / Jerry Mismatch ---');
  
  const { data: contacts } = await supabase.from('crm_contacts').select('*').ilike('name', '%Ritpol%');
  console.log('CRM Contacts matching "Ritpol":', JSON.stringify(contacts, null, 2));

  const { data: profiles } = await supabase.from('profiles').select('*').ilike('email', 'ritpol@hotmail.com');
  console.log('Profiles matching "ritpol@hotmail.com":', JSON.stringify(profiles, null, 2));

  const { data: jerryProfiles } = await supabase.from('profiles').select('*').ilike('username', '%Jerry%');
  console.log('Profiles matching username "Jerry":', JSON.stringify(jerryProfiles, null, 2));

  if (contacts && contacts[0]) {
    const sellerAddr = (contacts[0].address || '').trim().toLowerCase();
    const { data: props } = await supabase.from('octo_properties').select('id, address_name, title');
    const matchedProps = props.filter(p => {
      const propAddr = (p.address_name || p.title || '').trim().toLowerCase();
      return propAddr === sellerAddr && sellerAddr !== '';
    });
    console.log(`Properties matching address "${sellerAddr}":`, JSON.stringify(matchedProps, null, 2));
  }
}

diagnose();
