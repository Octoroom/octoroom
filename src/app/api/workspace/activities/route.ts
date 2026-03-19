
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const formatAmountLabel = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return null;
  return `$${Number(amount).toLocaleString()}`;
};

const buildNotificationContent = (type: string, buyerName?: string | null, amountLabel?: string | null) => {
  const name = buyerName || 'Buyer';
  switch (type) {
    case 'offer':
      return `${name} sent an offer${amountLabel ? ` ${amountLabel}` : ''}`;
    case 'offer_signed_buyer':
      return `${name} signed the offer${amountLabel ? ` at ${amountLabel}` : ''}`;
    case 'offer_signed_seller':
      return `${name}'s offer was accepted${amountLabel ? ` at ${amountLabel}` : ''}`;
    case 'offer_rejected':
      return `${name}'s offer was rejected${amountLabel ? ` at ${amountLabel}` : ''}`;
    default:
      return null;
  }
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const buyerEmail = searchParams.get('buyerEmail');
    const buyerCrmId = searchParams.get('buyerId');
    const viewerId = searchParams.get('viewerId');

    if (!propertyId || (!buyerEmail && !viewerId)) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // 1. Resolve Buyer Auth UUID when in buyer scope
    let resolvedBuyerId = buyerCrmId;
    let users: any[] = [];
    try {
      const { data } = await supabaseAdmin.auth.admin.listUsers();
      users = data.users || [];
      if (buyerEmail) {
        const actualUser = users.find(u => u.email?.toLowerCase() === buyerEmail.toLowerCase());
        if (actualUser) {
          resolvedBuyerId = actualUser.id;
        }
      }
    } catch (err) {
      console.error("Error resolving user in activities GET:", err);
    }

    // 2. Fetch Notifications (System Events)
    let notifQuery = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('reference_id', propertyId);

    if (!buyerEmail && viewerId) {
      notifQuery = notifQuery.eq('receiver_id', viewerId);
    }

    const { data: notifs, error: nError } = await notifQuery;

    if (nError) throw nError;

    // 3. Filter Notifications
    const filteredNotifs = buyerEmail
      ? notifs.filter(n =>
          n.receiver_id === resolvedBuyerId ||
          n.actor_id === resolvedBuyerId ||
          (buyerCrmId && (n.receiver_id === buyerCrmId || n.actor_id === buyerCrmId))
        )
      : notifs;

    // 4. Fetch CRM Notes (Agent Actions/AI Summaries)
    let notesQuery = supabaseAdmin
      .from('crm_notes')
      .select('*')
      .eq('property_id', propertyId);

    if (buyerEmail) {
      notesQuery = notesQuery.or(`buyer_id.eq.${resolvedBuyerId},buyer_id.eq.${buyerCrmId}`);
    } else if (viewerId) {
      notesQuery = notesQuery.eq('agent_id', viewerId);
    }

    const { data: notes, error: noteError } = await notesQuery;

    if (noteError) {
      console.warn("CRM Notes table might be missing or error occurred:", noteError.message);
    }

    const actorIds = [...new Set(filteredNotifs.map((n: any) => n.actor_id).filter(Boolean))];
    const buyerIdsFromNotes = [...new Set((notes || []).map((n: any) => n.buyer_id).filter(Boolean))];
    const profileIds = [...new Set([...actorIds, ...buyerIdsFromNotes])];

    const { data: profiles } = profileIds.length > 0
      ? await supabaseAdmin.from('profiles').select('id, email, username, avatar_url').in('id', profileIds)
      : { data: [] };

    const profileById = new Map((profiles || []).map((profile: any) => [profile.id, profile]));
    const buyerEmails = (profiles || []).map((profile: any) => profile.email).filter(Boolean);
    const { data: contacts } = viewerId && buyerEmails.length > 0
      ? await supabaseAdmin.from('crm_contacts').select('id, name, email').eq('agent_id', viewerId).in('email', buyerEmails)
      : { data: [] };

    const contactByEmail = new Map((contacts || []).map((contact: any) => [contact.email?.toLowerCase(), contact]));
    const contactById = new Map((contacts || []).map((contact: any) => [contact.id, contact]));

    const { data: offers } = await supabaseAdmin
      .from('octo_offers')
      .select('buyer_id, offer_price, status, created_at')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    const latestOfferByBuyerId = new Map<string, any>();
    (offers || []).forEach((offer: any) => {
      if (!latestOfferByBuyerId.has(offer.buyer_id)) {
        latestOfferByBuyerId.set(offer.buyer_id, offer);
      }
    });

    const resolveBuyerIdentity = (buyerId: string | null | undefined) => {
      if (!buyerId) return { buyer_name: null, avatar_url: null, amount_label: null };
      const profile = profileById.get(buyerId);
      const contact = contactById.get(buyerId) || (profile?.email ? contactByEmail.get(profile.email.toLowerCase()) : null);
      const latestOffer = latestOfferByBuyerId.get(buyerId);

      return {
        buyer_name: contact?.name || profile?.username || profile?.email || 'Buyer',
        avatar_url: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${buyerId}`,
        amount_label: formatAmountLabel(latestOffer?.offer_price)
      };
    };

    // 5. Merge and Sort
    const combined = [
      ...filteredNotifs.map((n: any) => {
        const buyerMeta = resolveBuyerIdentity(n.actor_id);
        return {
          ...n,
          source: 'notification',
          buyer_name: buyerMeta.buyer_name,
          avatar_url: buyerMeta.avatar_url,
          amount_label: buyerMeta.amount_label,
          content: n.content || buildNotificationContent(n.type, buyerMeta.buyer_name, buyerMeta.amount_label) || n.content
        };
      }),
      ...(notes || []).map((n: any) => {
        const buyerMeta = resolveBuyerIdentity(n.buyer_id);
        return {
          ...n,
          source: 'crm_note',
          buyer_name: buyerMeta.buyer_name,
          avatar_url: buyerMeta.avatar_url,
          amount_label: buyerMeta.amount_label
        };
      })
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
