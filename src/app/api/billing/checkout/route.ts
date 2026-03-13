import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { isUuid, normalizeUuid } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';

export async function POST(request: Request) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return NextResponse.json({ error: 'Billing not configured' }, { status: 503 });

    const body = await request.json().catch(() => ({}));
    const userOrgId = await getOrganizationId();
    if (!userOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const rawOrgId = body.organizationId as string | undefined;
    const organizationId = rawOrgId ? normalizeUuid(String(rawOrgId)) : userOrgId;
    if (!isUuid(organizationId)) {
      return NextResponse.json({ error: 'Invalid organizationId' }, { status: 400 });
    }
    if (organizationId !== userOrgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const stripe = new Stripe(secretKey);
    const supabase = createAdminClient();
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (subError) {
      console.error('[API Error] billing/checkout: subscriptions select failed', subError);
      return NextResponse.json(
        { error: 'Could not load billing record. Please try again.' },
        { status: 503 }
      );
    }

    let customerId = sub?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { organization_id: organizationId },
      });
      customerId = customer.id;
      const { error: upsertError } = await supabase
        .from('subscriptions')
        .upsert(
          {
            organization_id: organizationId,
            stripe_customer_id: customerId,
            status: 'trialing',
          },
          { onConflict: 'organization_id' }
        );
      if (upsertError) {
        console.error('[API Error] billing/checkout: subscriptions upsert failed', upsertError);
        return NextResponse.json(
          { error: 'Could not save billing customer. Please try again.' },
          { status: 503 }
        );
      }
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) return NextResponse.json({ error: 'Billing not configured' }, { status: 503 });

    const createSession = (customer: string) =>
      stripe.checkout.sessions.create({
        customer: customer,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing?success=1`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/billing`,
        subscription_data: {
          trial_period_days: 7,
          metadata: { organization_id: organizationId },
        },
        metadata: { organization_id: organizationId },
      });

    let session;
    try {
      session = await createSession(customerId!);
    } catch (sessionErr: unknown) {
      const stripeErr = sessionErr as { code?: string; message?: string };
      const isInvalidCustomer =
        stripeErr?.message?.includes('No such customer') || stripeErr?.code === 'resource_missing';
      if (!isInvalidCustomer || !customerId) throw sessionErr;

      // Stored customer was deleted in Stripe (or wrong account). Create new and retry.
      const customer = await stripe.customers.create({
        metadata: { organization_id: organizationId },
      });
      customerId = customer.id;
      const { error: updateError } = await supabase
        .from('subscriptions')
        .upsert(
          { organization_id: organizationId, stripe_customer_id: customerId, status: 'trialing' },
          { onConflict: 'organization_id' }
        );
      if (updateError) {
        console.error('[API Error] billing/checkout: update customer id after invalid customer', updateError);
        throw updateError;
      }
      session = await createSession(customerId);
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    // Log full error for debugging (Stripe/Supabase/auth issues)
    console.error('[API Error] billing/checkout:', err);
    return handleApiError(err, 'billing/checkout');
  }
}
