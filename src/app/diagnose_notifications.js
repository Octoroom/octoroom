require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: notifs } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(10);
  console.log("Recent notifications:", JSON.stringify(notifs, null, 2));

  const uids = [...new Set(notifs.map(n => n.receiver_id))];
  const { data: profiles } = await supabase.from('profiles').select('id, email, username').in('id', uids);
  console.log("Profiles for receivers:", profiles);
  
  const { data: users } = await supabase.auth.admin.listUsers();
  const authUsers = users.users.filter(u => uids.includes(u.id)).map(u => ({id: u.id, email: u.email}));
  console.log("Auth users for receivers:", authUsers);
}
check();
