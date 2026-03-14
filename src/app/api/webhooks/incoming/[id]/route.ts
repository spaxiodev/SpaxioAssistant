import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_BODY_SIZE = 100_000; // 100KB

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

type Params = { params: Promise<{ id: string }> };

/** POST: receive webhook payload. Header X-Webhook-Secret must match endpoint secret. */
export async function POST(request: Request, { params }: Params) {
  const { id: endpointId } = await params;
  const secret = request.headers.get('X-Webhook-Secret') ?? request.headers.get('x-webhook-secret') ?? '';

  const supabase = createAdminClient();
  const { data: endpoint, error: epError } = await supabase
    .from('webhook_endpoints')
    .select('id, organization_id, secret, active')
    .eq('id', endpointId)
    .single();

  if (epError || !endpoint) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }
  if (!endpoint.active) {
    return NextResponse.json({ error: 'Endpoint is paused' }, { status: 403 });
  }
  if (!timingSafeEqual(secret, endpoint.secret)) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  let payload: unknown = {};
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_SIZE) {
      await supabase
        .from('webhook_endpoints')
        .update({
          last_failure_at: new Date().toISOString(),
          last_failure_message: 'Payload too large',
        })
        .eq('id', endpointId);
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
    if (text.trim()) {
      payload = JSON.parse(text);
    }
  } catch {
    payload = {};
  }

  const { data: event, error: insertError } = await supabase
    .from('webhook_events')
    .insert({
      endpoint_id: endpointId,
      payload: payload as Record<string, unknown>,
      status: 'received',
    })
    .select('id')
    .single();

  if (insertError) {
    await supabase
      .from('webhook_endpoints')
      .update({
        last_failure_at: new Date().toISOString(),
        last_failure_message: insertError.message.slice(0, 500),
      })
      .eq('id', endpointId);
    return NextResponse.json({ error: 'Failed to store event' }, { status: 500 });
  }

  await supabase
    .from('webhook_endpoints')
    .update({ last_success_at: new Date().toISOString(), last_failure_message: null })
    .eq('id', endpointId);

  return NextResponse.json({ received: true, event_id: event?.id }, { status: 202 });
}
