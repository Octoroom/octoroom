// src/app/api/stripe/refund/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Cancellation policy windows (in days before check-in)
const POLICY_WINDOWS: Record<string, number> = {
  flexible: 3,
  standard: 7,
  strict: 14,
};

// Grace period: within 24h of booking AND 7+ days before check-in = always refundable
const GRACE_HOURS = 24;
const GRACE_CHECKIN_DAYS = 7;

export async function POST(req: Request) {
  try {
    const { bookingId } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    // 1. Fetch booking
    const { data: booking, error: fetchErr } = await supabaseAdmin
      .from('octo_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.payment_status !== 'held') {
      return NextResponse.json({
        error: '该订单不可退款',
        reason: booking.payment_status === 'refunded' ? '已退款' :
                booking.payment_status === 'transferred' ? '资金已打款给房东' : '状态异常',
      }, { status: 400 });
    }

    // 2. Check refund eligibility
    const now = new Date();
    const checkInDate = new Date(booking.check_in);
    const paidAt = new Date(booking.paid_at);
    const daysUntilCheckIn = Math.ceil((checkInDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    const hoursSincePayment = (now.getTime() - paidAt.getTime()) / (1000 * 3600);

    // Grace period: 24h since payment + 7 days before check-in
    const isInGracePeriod = hoursSincePayment <= GRACE_HOURS && daysUntilCheckIn >= GRACE_CHECKIN_DAYS;

    // Policy window
    const policy = booking.cancellation_policy || 'standard';
    const policyWindow = POLICY_WINDOWS[policy] || 7;
    const isInPolicyWindow = daysUntilCheckIn >= policyWindow;

    if (!isInGracePeriod && !isInPolicyWindow) {
      return NextResponse.json({
        eligible: false,
        error: '已超过退款期限',
        policy,
        policyWindow,
        daysUntilCheckIn,
        message: `根据「${policy === 'flexible' ? '灵活' : policy === 'standard' ? '标准' : '严格'}」退款政策，需在入住前 ${policyWindow} 天申请退款。当前距入住仅剩 ${daysUntilCheckIn} 天。`,
      }, { status: 400 });
    }

    // 3. Process refund via Stripe
    const refund = await stripe.refunds.create({
      payment_intent: booking.stripe_payment_intent_id,
      reason: 'requested_by_customer',
    });

    // 4. Update booking
    const { error: updateErr } = await supabaseAdmin
      .from('octo_bookings')
      .update({
        status: 'cancelled',
        payment_status: 'refunded',
        refunded_at: new Date().toISOString(),
        host_unread: true,
      })
      .eq('id', bookingId);

    if (updateErr) {
      console.error('Failed to update booking after refund:', updateErr);
    }

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      amount: refund.amount,
      message: '退款成功，资金将在 5-10 个工作日内退回原支付方式。',
    });
  } catch (err: any) {
    console.error('Refund Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to process refund' },
      { status: 500 }
    );
  }
}

// GET: check refund eligibility without processing
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get('bookingId');

  if (!bookingId) {
    return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
  }

  const { data: booking } = await supabaseAdmin
    .from('octo_bookings')
    .select('check_in, paid_at, payment_status, cancellation_policy')
    .eq('id', bookingId)
    .single();

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (booking.payment_status !== 'held') {
    return NextResponse.json({ eligible: false, reason: '不可退款' });
  }

  const now = new Date();
  const checkInDate = new Date(booking.check_in);
  const paidAt = new Date(booking.paid_at);
  const daysUntilCheckIn = Math.ceil((checkInDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
  const hoursSincePayment = (now.getTime() - paidAt.getTime()) / (1000 * 3600);

  const isInGracePeriod = hoursSincePayment <= GRACE_HOURS && daysUntilCheckIn >= GRACE_CHECKIN_DAYS;
  const policy = booking.cancellation_policy || 'standard';
  const policyWindow = POLICY_WINDOWS[policy] || 7;
  const isInPolicyWindow = daysUntilCheckIn >= policyWindow;

  const policyLabels: Record<string, string> = { flexible: '灵活', standard: '标准', strict: '严格' };

  return NextResponse.json({
    eligible: isInGracePeriod || isInPolicyWindow,
    policy,
    policyLabel: policyLabels[policy] || policy,
    policyWindow,
    daysUntilCheckIn,
    isInGracePeriod,
    deadline: new Date(checkInDate.getTime() - policyWindow * 24 * 3600 * 1000).toISOString(),
  });
}
