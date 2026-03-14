import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { handleApiError } from '@/lib/api-error';
import { getPlanIdFromStripePriceId } from '@/lib/billing/price-to-plan';

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey || !webhookSecret) {
      return NextResponse.json({ error: 'Missing Stripe config' }, { status: 503 });
    }
    const stripe = new Stripe(secretKey);

    const body = await request.text();
    const sig = request.headers.get('stripe-signature');
    if (!sig) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const updatePayload = (
      stripeSubscriptionId: string,
      stripePriceId: string | null,
      status: string,
      trialEnd: number | null,
      currentPeriodEnd: number | null
    ) => ({
      stripe_subscription_id: stripeSubscriptionId,
      stripe_price_id: stripePriceId,
      status,
      trial_ends_at: trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
      current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
    });

    const applyUpdate = async (orgId: string, sub: Stripe.Subscription) => {
      const priceId = sub.items.data[0]?.price.id ?? null;
      const planId = await getPlanIdFromStripePriceId(supabase, priceId);
      await supabase
        .from('subscriptions')
        .update({
          ...updatePayload(
            sub.id,
            priceId,
            sub.status as string,
            sub.trial_end ?? null,
            sub.current_period_end ?? null
          ),
          plan_id: planId,
        })
        .eq('organization_id', orgId);
    };

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.organization_id;
      if (orgId && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        await applyUpdate(orgId, sub);
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      let orgId = sub.metadata?.organization_id;
      if (!orgId) {
        const customerId = sub.customer as string;
        const { data: row } = await supabase
          .from('subscriptions')
          .select('organization_id')
          .eq('stripe_customer_id', customerId)
          .single();
        if (row) orgId = row.organization_id;
      }
      if (orgId) await applyUpdate(orgId, sub);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return handleApiError(err, 'billing/webhook');
  }
}
