
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/JerryFu/octoroom/.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      receiver_id: '00000000-0000-0000-0000-000000000000',
      actor_id: '00000000-0000-0000-0000-000000000000',
      type: 'test',
      reference_id: '17419957-de38-4e16-ba44-3fadf6c468c1',
      metadata: { foo: 'bar' }
    });
  
  if (error) {
    console.log('Error inserting with metadata:', error.message);
  } else {
    console.log('Success inserting with metadata!');
  }
}

test();
