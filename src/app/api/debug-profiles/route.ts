import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data: profiles } = await supabase.from('profiles').select('*');
  const { data: contacts } = await supabase.from('crm_contacts').select('*');
  const { data: properties } = await supabase.from('octo_properties').select('*');
  
  return NextResponse.json({ profiles, contacts, properties });
}
