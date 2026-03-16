// src/app/api/checkout/success/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id');
  const bookingId = searchParams.get('booking_id');
  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

  if (!sessionId || !bookingId) {
    return NextResponse.redirect(new URL('/my-bookings', req.url));
  }

  try {
    // 1. Verify the Stripe session is real and paid
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      console.error('Session not paid:', session.payment_status);
      return NextResponse.redirect(`${origin}/my-bookings?payment=error`);
    }

    // 2. Get the booking's room to snapshot cancellation_policy
    const { data: booking } = await supabaseAdmin
      .from('octo_bookings')
      .select('room_id')
      .eq('id', bookingId)
      .single();

    let cancellationPolicy = 'standard';
    if (booking?.room_id) {
      const { data: room } = await supabaseAdmin
        .from('octo_rooms')
        .select('cancellation_policy')
        .eq('id', booking.room_id)
        .single();
      cancellationPolicy = room?.cancellation_policy || 'standard';
    }

    // 3. Update booking with escrow info
    const { error } = await supabaseAdmin
      .from('octo_bookings')
      .update({
        status: 'paid',
        host_unread: true,
        stripe_payment_intent_id: session.payment_intent as string,
        payment_status: 'held',  // funds held on platform
        paid_amount: session.amount_total,
        paid_currency: session.currency || 'nzd',
        paid_at: new Date().toISOString(),
        cancellation_policy: cancellationPolicy,
      })
      .eq('id', bookingId);

    if (error) {
      console.error('Error updating booking:', error);
      return NextResponse.redirect(`${origin}/my-bookings?payment=error`);
    }

    return NextResponse.redirect(`${origin}/my-bookings?payment=success`);
  } catch (err) {
    console.error('Checkout Success Error:', err);
    return NextResponse.redirect(`${origin}/my-bookings?payment=error`);
  }
}
