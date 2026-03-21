const fs = require('fs');
const env = fs.readFileSync('../../.env.local', 'utf8');
let url, key;
env.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
});

async function check() {
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` };
  
  // 1. Get recent notifications
  let res = await fetch(`${url}/rest/v1/notifications?order=created_at.desc&limit=15`, { headers });
  let notifs = await res.json();
  console.log("=== Recent Notifications ===");
  notifs.forEach(n => {
    console.log(`[${n.created_at}] Type: ${n.type} | To: ${n.receiver_id} | From: ${n.actor_id} | Ref: ${n.reference_id} | Meta: ${JSON.stringify(n.metadata)}`);
  });

  // 2. Get recent offers
  res = await fetch(`${url}/rest/v1/octo_offers?select=id,status,buyer_id,property_id,created_at&order=created_at.desc&limit=5`, { headers });
  let offers = await res.json();
  console.log("\n=== Recent Offers ===");
  offers.forEach(o => {
    console.log(`[${o.created_at}] ID: ${o.id} | Status: ${o.status} | Buyer: ${o.buyer_id} | Prop: ${o.property_id}`);
  });
  
  process.exit(0);
}
check();
