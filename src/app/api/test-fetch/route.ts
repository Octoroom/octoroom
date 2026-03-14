import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*');

    const mapped = data?.map(p => ({id: p.id, role: p.role, name: p.full_name}));
    
    return NextResponse.json({ success: true, count: data?.length, mapped: mapped, error: error });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
