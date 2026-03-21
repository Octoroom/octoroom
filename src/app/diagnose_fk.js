const fs = require('fs');
const env = fs.readFileSync('../../.env.local', 'utf8');
let url, key;
env.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
});
const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(url, key);

async function check() {
  // test inserting with a fake UUID
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const { data, error } = await supabaseAdmin.from('notifications').insert({
    receiver_id: fakeId,
    actor_id: fakeId,
    type: 'test',
    content: 'test',
    reference_id: 'test'
  });
  console.log("Insert result:");
  console.log(error || "Success");
}
check();
