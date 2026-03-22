const fs = require('fs');
const env = fs.readFileSync('../../.env.local', 'utf8');
let url, key;
env.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
});

const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin = createClient(url, key);

async function testApi() {
  const offerId = 'c00d31d5-abf5-418f-8a06-ae082a0d08fb';
  const propertyId = '17419957-de38-4e16-ba44-3fadf6c468c1';

  try {
    const { data: offer, error: offerError } = await supabaseAdmin
      .from('octo_offers')
      .select('*')
      .eq('id', offerId)
      .single();

    if (offerError) throw offerError;

    const { data: propertyData, error: propError } = await supabaseAdmin
      .from('octo_properties')
      .select('title, address_name, author_id')
      .eq('id', propertyId)
      .single();

    if (propError) throw propError;

    console.log("Success! Data:", {
      ...offer,
      properties: propertyData || { address_name: 'Unknown Address' }
    });
  } catch (err) {
    console.error("API logic failed:", err);
  }
}

testApi();
