
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
            console.log(`Resolved Auth UUID for ${buyerEmail}: ${resolvedBuyerId}`);
        }
    } catch (err) {
        console.error("Error listing users in activities API:", err);
    }

    // 2. Fetch Notifications for this property
    // We fetch all records for the property and filter to ensure we get the bidirectional interaction
    const { data: notifs, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('reference_id', propertyId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 3. Filter to find interactions involving this buyer (either as actor or receiver)
    const activities = notifs.filter(n => 
      n.receiver_id === resolvedBuyerId || 
      n.actor_id === resolvedBuyerId ||
      (buyerCrmId && (n.receiver_id === buyerCrmId || n.actor_id === buyerCrmId))
    );

    return NextResponse.json({ activities });

  } catch (error: any) {
    console.error("Activities API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
