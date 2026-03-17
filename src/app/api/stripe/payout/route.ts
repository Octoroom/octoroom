// src/app/api/stripe/payout/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { bookingId, manual } = await req.json();

    // Mode 1: Single booking payout (manual trigger)
    if (bookingId) {
      const result = await processPayoutForBooking(bookingId, stripe, supabaseAdmin);
      return NextResponse.json(result);
    }

    // Mode 2: Batch payout for all eligible bookings (cron trigger)
    const today = new Date().toISOString().split('T')[0];

    const { data: eligibleBookings, error } = await supabaseAdmin
      .from('octo_bookings')
      .select('id')
      .eq('payment_status', 'held')
      .eq('status', 'paid')
      .lte('check_in', today);

    if (error) {
      return NextResponse.json({ error: 'Failed to query bookings' }, { status: 500 });
    }

    if (!eligibleBookings || eligibleBookings.length === 0) {
      return NextResponse.json({ message: 'No bookings eligible for payout', processed: 0 });
    }

    const results = [];
    for (const b of eligibleBookings) {
      const result = await processPayoutForBooking(b.id, stripe, supabaseAdmin);
      results.push({ bookingId: b.id, ...result });
    }

    const successCount = results.filter(r => r.success).length;
    return NextResponse.json({
      processed: results.length,
      successful: successCount,
      failed: results.length - successCount,
      results,
    });
  } catch (err: any) {
    console.error('Payout Error:', err);
    return NextResponse.json({ error: err.message || 'Payout failed' }, { status: 500 });
  }
}

async function processPayoutForBooking(bookingId: string, stripe: Stripe, supabaseAdmin: any) {
  try {
    // 1. Fetch booking
    const { data: booking, error: fetchErr } = await supabaseAdmin
      .from('octo_bookings')
      .select('*, octo_rooms(id, title)')
      .eq('id', bookingId)
      .single();

    if (fetchErr || !booking) {
      return { success: false, error: 'Booking not found' };
    }

    if (booking.payment_status !== 'held') {
      return { success: false, error: `Invalid payment_status: ${booking.payment_status}` };
    }

    // Check: only pay out on or after check-in date
    const today = new Date();
    const checkIn = new Date(booking.check_in);
    if (today < checkIn) {
      return { success: false, error: 'Check-in date not yet reached' };
    }

    // 2. Get host's stripe_account_id
    const { data: { user: hostUser } } = await supabaseAdmin.auth.admin.getUserById(booking.host_id);
    const hostStripeAccountId = hostUser?.user_metadata?.stripe_account_id;

    if (!hostStripeAccountId) {
      return { success: false, error: 'Host has no Stripe account connected' };
    }

    // 3. Transfer funds to host
    const transfer = await stripe.transfers.create({
      amount: booking.paid_amount,
      currency: booking.paid_currency || 'nzd',
      destination: hostStripeAccountId,
      description: `Payout for booking ${bookingId.split('-')[0].toUpperCase()} - ${booking.octo_rooms?.title || 'Room'}`,
      metadata: { bookingId },
    });

    // 4. Update booking
    await supabaseAdmin
      .from('octo_bookings')
      .update({
        payment_status: 'transferred',
        stripe_transfer_id: transfer.id,
        transferred_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    return {
      success: true,
      transferId: transfer.id,
      amount: transfer.amount,
      destination: hostStripeAccountId,
    };
  } catch (err: any) {
    console.error(`Payout failed for booking ${bookingId}:`, err);
    return { success: false, error: err.message };
  }
}
