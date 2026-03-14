require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio, role')
        .in('role', ['LAWYER', 'INSPECTOR', 'BROKER', 'VALUER', 'PHOTOGRAPHER', 'STAGER']);
  
  console.log("Error:", error);
  console.log("Data count:", data?.length);
  if (data?.length > 0) {
    console.log("First item:", data[0]);
  }
}
check();
