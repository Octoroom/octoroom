import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
  const stripe = new Stripe(stripeSecretKey);
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  try {
    const { userId, email, returnUrl } = await req.json();

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
    }

    if (!stripeSecretKey) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
    }

    // 1. 使用 Admin API 通过 userId 获取用户，无需 session
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !user) {
      console.error('Failed to fetch user:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let stripeAccountId = user.user_metadata?.stripe_account_id || null;

    // 2. If no account exists, create a new Express account linked to them
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'NZ',
        email: email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      stripeAccountId = account.id;

      // 使用 Admin API 回写 stripe_account_id 到 user_metadata
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...user.user_metadata,
          stripe_account_id: stripeAccountId,
        },
      });

      if (updateError) {
        console.error('Failed to save stripe_account_id:', updateError);
        // 即使保存失败，仍然继续 onboarding 流程（账户已在 Stripe 创建）
      }
    }

    // 3. Create an Account Link for them to complete onboarding
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const refreshUrl = `${origin}/my-rooms?tab=payouts`;
    const finalReturnUrl = returnUrl || `${origin}/my-rooms?tab=payouts&stripe_connected=true`;

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: finalReturnUrl,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });

  } catch (error: any) {
    console.error('Stripe Connect Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate Stripe Connect link' }, { status: 500 });
  }
}
