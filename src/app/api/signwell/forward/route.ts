import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { offerId, propertyId, agentId } = await request.json();

    if (!offerId || !propertyId || !agentId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // 1. Update the offer status
    const { data: updatedOffer, error: updateError } = await supabaseAdmin
      .from('octo_offers')
      .update({ status: 'pending_seller_signature' })
      .eq('id', offerId)
      .select('signwell_doc_id')
      .single();

    if (updateError) {
      console.error("❌ Error updating offer status to pending_seller_signature:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 2. Fetch property author_id (Seller)
    const { data: prop } = await supabaseAdmin
      .from('octo_properties')
      .select('author_id')
      .eq('id', propertyId)
      .single();

    if (prop) {
      // 3. Insert notification for the SELLER
      await supabaseAdmin.from('notifications').insert({
        receiver_id: prop.author_id,
        actor_id: agentId, // the agent pushing the offer
        type: 'offer_pushed_seller',
        content: '买家已完成签署，等待卖家确认',
        reference_id: propertyId,
        metadata: { offer_id: offerId },
        is_read: false
      });
    }

    return NextResponse.json({ success: true, documentId: updatedOffer?.signwell_doc_id });

  } catch (error: any) {
    console.error("❌ Failed to push offer to seller:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
