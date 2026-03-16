import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = new Stripe(stripeSecretKey);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const stripeAccountId = searchParams.get('stripeAccountId');

    if (!stripeAccountId) {
      return NextResponse.json({ error: 'Missing stripeAccountId' }, { status: 400 });
    }

    if (!stripeSecretKey) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    // 1. Retrieve balance for the connected account
    const balance = await stripe.balance.retrieve({
      stripeAccount: stripeAccountId,
    });

    const available = balance.available.reduce((sum, b) => sum + b.amount, 0);
    const pending = balance.pending.reduce((sum, b) => sum + b.amount, 0);
    const currency = balance.available[0]?.currency || balance.pending[0]?.currency || 'nzd';

    // 2. Retrieve recent balance transactions (charges, refunds, payouts etc.)
    let transactions: any[] = [];
    try {
      const txList = await stripe.balanceTransactions.list(
        { limit: 30 },
        { stripeAccount: stripeAccountId }
      );
      transactions = txList.data.map((tx) => ({
        id: tx.id,
        amount: tx.amount,
        net: tx.net,
        fee: tx.fee,
        currency: tx.currency,
        type: tx.type,
        description: tx.description || '',
        created: tx.created,
        status: tx.status,
      }));
    } catch (e) {
      // New accounts may not have transactions yet
      console.warn('Could not fetch transactions:', e);
    }

    // 3. Retrieve recent payouts
    let payouts: any[] = [];
    try {
      const payoutList = await stripe.payouts.list(
        { limit: 10 },
        { stripeAccount: stripeAccountId }
      );
      payouts = payoutList.data.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        arrival_date: p.arrival_date,
        created: p.created,
        description: p.description || '',
      }));
    } catch (e) {
      console.warn('Could not fetch payouts:', e);
    }

    return NextResponse.json({
      balance: {
        available: available, // in cents
        pending: pending,     // in cents
        currency: currency,
      },
      transactions,
      payouts,
    });
  } catch (error: any) {
    console.error('Stripe Dashboard Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
