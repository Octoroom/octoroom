const fs = require('fs');
const env = fs.readFileSync('../../.env.local', 'utf8');
let url, key;
env.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
});

async function check() {
  const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` };
  let res = await fetch(`${url}/rest/v1/notifications?limit=1`, { headers });
  let notifs = await res.json();
  if (notifs.length > 0) {
    console.log("Columns in notifications:", Object.keys(notifs[0]));
  } else {
    console.log("No notifications to check columns.");
  }
}
check();
