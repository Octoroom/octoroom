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
        const agentId = prop.author_id;
        const buyerId = offer.buyer_id;

        // 1. 通知受检方 (如果是卖家拒绝，通知买家；如果是买家拒绝，通知代理/卖家)
        const receiverId = (rejectedBy === 'SELLER') ? buyerId : agentId;
        const actorId = (rejectedBy === 'SELLER') ? agentId : buyerId;

        await supabaseAdmin.from('notifications').insert({
            receiver_id: receiverId,
            actor_id: actorId,
            type: 'offer_rejected',
            reference_id: propertyId,
            is_read: false
        });

        // 2. 🌟 同时给发起方也发一条通知，确保其工作台时间线能双向同步展示
        await supabaseAdmin.from('notifications').insert({
            receiver_id: actorId, // 发起方作为接收者（为了时间线展示）
            actor_id: receiverId, 
            type: 'offer_rejected',
            reference_id: propertyId,
            is_read: false
        });

        // 3. 🌟 回退 CRM 客户状态为 WORKING，以便代理商跟进
        try {
            const { data: userData } = await supabaseAdmin.auth.admin.getUserById(buyerId);
            const buyerEmail = userData?.user?.email;

            if (buyerEmail) {
                await supabaseAdmin
                    .from('crm_contacts')
                    .update({ status: 'WORKING' })
                    .eq('email', buyerEmail)
                    .eq('agent_id', agentId);
                console.log(`✅ 已自动回退买家 [${buyerEmail}] 的 CRM 状态为 WORKING`);
            }
        } catch (crmErr) {
            console.error("回退 CRM 状态失败 (非核心流程):", crmErr);
        }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("❌ 拒绝 Offer 失败:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
