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
  let res = await fetch(`${url}/rest/v1/notifications?order=created_at.desc&limit=20`, { headers });
  let notifs = await res.json();
  console.log("Recent notifications type and receiver:");
  notifs.forEach(n => console.log(`- Type: ${n.type}, Receiver: ${n.receiver_id}, Date: ${n.created_at}, Read: ${n.is_read}`));

  if (notifs.length === 0) { console.log("No notifications found."); return; }

  const uids = [...new Set(notifs.map(n => n.receiver_id))];
  
  // 2. Get profiles
  res = await fetch(`${url}/rest/v1/profiles?id=in.(${uids.join(',')})&select=id,email`, { headers });
  let profiles = await res.json();
  console.log("\nProfiles for receivers:");
  console.log(profiles);

  // 3. Get Auth users
  res = await fetch(`${url}/auth/v1/admin/users`, { headers });
  let authData = await res.json();
  let users = authData.users;
  const authUsers = users.filter(u => uids.includes(u.id)).map(u => ({id: u.id, email: u.email}));
  console.log("\nAuth users for receivers:");
  console.log(authUsers);

  // also find missing profiles (receiver_id not in auth)
  const authIds = authUsers.map(u => u.id);
  const missing = uids.filter(id => !authIds.includes(id));
  console.log("\nReceiver IDs NOT in Auth users:");
  console.log(missing);
}
check();
