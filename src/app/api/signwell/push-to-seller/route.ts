import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { offerId, propertyId, agentId } = await request.json();

    if (!offerId || !propertyId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. 更新 Offer 状态为：等待卖家签字
    const { error: updateError } = await supabaseAdmin
      .from('octo_offers')
      .update({ status: 'pending_seller_signature' })
      .match({ id: offerId });

    if (updateError) throw updateError;

    // 2. 找到这套房子的主人 (卖家)
    const { data: prop } = await supabaseAdmin
      .from('octo_properties')
      .select('author_id')
      .eq('id', propertyId)
      .single();

    // 3. 往 Timeline 插入那条关键动态
    if (prop?.author_id) {
      await supabaseAdmin.from('notifications').insert({
        receiver_id: prop.author_id,
        actor_id: agentId || null,
        type: 'offer_pending_seller',
        content: '买家已完成签署，等待卖家确认',
        reference_id: propertyId,
        metadata: { offer_id: offerId },
        is_read: false
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Push to Seller Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}