const fs = require('fs');
const env = fs.readFileSync('../../.env.local', 'utf8');
let url, key;
env.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
});

async function check() {
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` };
  
  let res = await fetch(`${url}/rest/v1/octo_offers?id=eq.c00d31d5-abf5-418f-8a06-ae082a0d08fb`, { headers });
  let offer = await res.json();
  console.log('Offer:', JSON.stringify(offer, null, 2));

  let res2 = await fetch(`${url}/rest/v1/octo_properties?id=eq.17419957-de38-4e16-ba44-3fadf6c468c1`, { headers });
  let prop = await res2.json();
  console.log('Property:', JSON.stringify(prop, null, 2));
}
check();
