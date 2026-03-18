
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const buyerEmail = searchParams.get('buyerEmail');
    const buyerCrmId = searchParams.get('buyerId');

    if (!propertyId || !buyerEmail) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // 1. Resolve Buyer Auth UUID
    let resolvedBuyerId = buyerCrmId;
    try {
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const actualUser = users.find(u => u.email?.toLowerCase() === buyerEmail.toLowerCase());
        if (actualUser) {
            resolvedBuyerId = actualUser.id;
        }
    } catch (err) {
        console.error("Error resolving user in activities GET:", err);
    }

    // 2. Fetch Notifications (System Events)
    const { data: notifs, error: nError } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('reference_id', propertyId);

    if (nError) throw nError;

    // 3. Filter Notifications
    const filteredNotifs = notifs.filter(n => 
      n.receiver_id === resolvedBuyerId || 
      n.actor_id === resolvedBuyerId ||
      (buyerCrmId && (n.receiver_id === buyerCrmId || n.actor_id === buyerCrmId))
    );

    // 4. Fetch CRM Notes (Agent Actions/AI Summaries)
    const { data: notes, error: noteError } = await supabaseAdmin
      .from('crm_notes')
      .select('*')
      .eq('property_id', propertyId)
      .or(`buyer_id.eq.${resolvedBuyerId},buyer_id.eq.${buyerCrmId}`);

    if (noteError) {
      console.warn("CRM Notes table might be missing or error occurred:", noteError.message);
    }

    // 5. Merge and Sort
    const combined = [
      ...filteredNotifs.map(n => ({ ...n, source: 'notification' })),
      ...(notes || []).map(n => ({ ...n, source: 'crm_note' }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ activities: combined });

  } catch (error: any) {
    console.error("Activities API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { propertyId, buyerId, buyerEmail, agentId, type, content, metadata } = await request.json();

    if (!propertyId || !buyerEmail || !type || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Resolve Buyer Auth UUID
    let resolvedBuyerId = buyerId;
    try {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
      const actualUser = users.find(u => u.email?.toLowerCase() === buyerEmail.toLowerCase());
      if (actualUser) {
        resolvedBuyerId = actualUser.id;
      }
    } catch (err) {
      console.error("Error resolving user in activities POST:", err);
    }

    // 2. Route to appropriate table
    if (type === 'followup_ai') {
      const { data: noteData, error: noteError } = await supabaseAdmin
        .from('crm_notes')
        .insert([
          {
            agent_id: agentId,
            buyer_id: resolvedBuyerId,
            property_id: propertyId,
            content: content,
            transcript: metadata?.transcript || null,
            type: 'ai_summary',
            metadata: metadata || {}
          }
        ])
        .select();

      if (noteError) throw noteError;
      return NextResponse.json({ success: true, activity: noteData[0] });
    } else {
      // Standard notification
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .insert([
          {
            type,
            actor_id: agentId,
            receiver_id: resolvedBuyerId,
            reference_id: propertyId,
            content,
            metadata: metadata || {},
            is_read: false
          }
        ])
        .select();

      if (error) throw error;
      return NextResponse.json({ success: true, activity: data[0] });
    }

  } catch (error: any) {
    console.error("Activities POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

