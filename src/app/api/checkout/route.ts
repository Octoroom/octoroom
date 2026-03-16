// src/app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    // 1. Fail early at runtime if Stripe isn't configured, rather than crashing the build
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    // 2. Initialize Stripe INSIDE the handler
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // 3. Initialize Supabase INSIDE the handler to prevent similar build-time crashes
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { bookingId, roomTitle, price, hostId, customHostUrl } = await req.json();

    if (!bookingId || !price) {
      return NextResponse.json({ error: 'Missing bookingId or price' }, { status: 400 });
    }

    // Parse price (e.g., "150 NZD / 晚" -> 15000 cents)
    const priceMatch = String(price).match(/[\d.]+/);
    const numericPrice = priceMatch ? parseFloat(priceMatch[0]) : 0;
    const amountInCents = Math.round(numericPrice * 100);
    const currencyMatch = String(price).match(/[a-zA-Z]+/);
    const currency = currencyMatch ? currencyMatch[0].toLowerCase() : 'nzd';

    if (amountInCents <= 0) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
    }

    // Look up the host's stripe_account_id for metadata
    let hostStripeAccountId = '';
    if (hostId) {
      const { data: { user: hostUser } } = await supabaseAdmin.auth.admin.getUserById(hostId);
      hostStripeAccountId = hostUser?.user_metadata?.stripe_account_id || '';
    }

    const origin = req.headers.get('origin') || customHostUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Platform escrow: NO transfer_data — funds stay on the platform account
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'alipay', 'wechat_pay'],
      payment_method_options: {
        wechat_pay: { client: 'web' },
      },
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `入住定金 - ${roomTitle || '精选房源'}`,
              description: `Booking ID: ${bookingId}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/api/checkout/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
      cancel_url: `${origin}/my-bookings`,
      metadata: {
        bookingId,
        hostStripeAccountId,
        amountInCents: String(amountInCents),
        currency,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}