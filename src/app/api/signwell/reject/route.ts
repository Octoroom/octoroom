import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { offerId, propertyId, reason, rejectedBy } = await request.json();

    if (!offerId) {
      return NextResponse.json({ error: "缺少 Offer ID" }, { status: 400 });
    }

    // 1. Update the offer status in octo_offers
    const { data: offer, error: offerError } = await supabaseAdmin
      .from('octo_offers')
      .update({ 
        status: 'rejected'
      })
      .eq('id', offerId)
      .select('buyer_id, property_id')
      .single();

    if (offerError) throw offerError;

    // 2. Optional: If it's a CRM contact, we might want to update their status back to WORKING
    // We can try to find the contact by buyer_id (if buyer_id is a CRM ID or if we have a mapping)
    // For now, let's keep it simple and just mark the offer as rejected.

    // 3. Create a notification for the other party
    const { data: prop } = await supabaseAdmin
        .from('octo_properties')
        .select('author_id')
        .eq('id', propertyId)
        .single();
    
    if (prop) {
        const receiverId = (rejectedBy === 'SELLER') ? offer.buyer_id : prop.author_id;
        await supabaseAdmin.from('notifications').insert({
            receiver_id: receiverId,
            actor_id: rejectedBy === 'SELLER' ? prop.author_id : offer.buyer_id,
            type: 'offer_rejected',
            reference_id: propertyId,
            is_read: false
        });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("❌ 拒绝 Offer 失败:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
