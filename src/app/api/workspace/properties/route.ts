import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json({ error: 'Missing agentId' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('workspace_properties')
      .select('property_id')
      .eq('agent_id', agentId)
      .eq('is_visible', true);

    if (error) throw error;

    return NextResponse.json({
      propertyIds: (data || []).map((row: { property_id: string }) => row.property_id)
    });
  } catch (error: any) {
    console.error('Workspace properties GET failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { agentId, propertyId, visible, source } = await request.json();

    if (!agentId || !propertyId || typeof visible !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('workspace_properties')
      .upsert(
        {
          agent_id: agentId,
          property_id: propertyId,
          is_visible: visible,
          source: source || 'manual'
        },
        { onConflict: 'agent_id,property_id' }
      );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Workspace properties POST failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
