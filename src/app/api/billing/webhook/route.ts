import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { handleApiError } from '@/lib/api-error';

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

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.organization_id;
      if (orgId && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        await supabase.from('subscriptions').update({
          stripe_subscription_id: sub.id,
          stripe_price_id: sub.items.data[0]?.price.id ?? null,
          status: sub.status as string,
          trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
        }).eq('organization_id', orgId);
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const orgId = sub.metadata?.organization_id;
      if (!orgId) {
        const customerId = sub.customer as string;
        const { data: row } = await supabase.from('subscriptions').select('organization_id').eq('stripe_customer_id', customerId).single();
        if (row) {
          await supabase.from('subscriptions').update({
            stripe_subscription_id: sub.id,
            stripe_price_id: sub.items.data[0]?.price.id ?? null,
            status: sub.status as string,
            trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
            current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          }).eq('organization_id', row.organization_id);
        }
      } else {
        await supabase.from('subscriptions').update({
          stripe_subscription_id: sub.id,
          stripe_price_id: sub.items.data[0]?.price.id ?? null,
          status: sub.status as string,
          trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
        }).eq('organization_id', orgId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return handleApiError(err, 'billing/webhook');
  }
}
