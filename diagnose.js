const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let url, key;
env.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function check() {
  const { data: notifs } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(20);
  console.log("Recent notifications type and receiver:");
  notifs.forEach(n => console.log(`- Type: ${n.type}, Receiver: ${n.receiver_id}, Date: ${n.created_at}, Read: ${n.is_read}`));

  const uids = [...new Set(notifs.map(n => n.receiver_id))];
  const { data: profiles } = await supabase.from('profiles').select('id, email, username').in('id', uids);
  console.log("\nProfiles for receivers:");
  console.log(profiles);
  
  const { data: users } = await supabase.auth.admin.listUsers();
  const authUsers = users.users.filter(u => uids.includes(u.id)).map(u => ({id: u.id, email: u.email}));
  console.log("\nAuth users for receivers:");
  console.log(authUsers);

  // also find missing profiles (receiver_id not in auth)
  const authIds = authUsers.map(u => u.id);
  const missing = uids.filter(id => !authIds.includes(id));
  console.log("\nReceiver IDs NOT in Auth users:");
  console.log(missing);
}
check();
