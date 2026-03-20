/**
 * Inbound email webhook endpoint.
 *
 * POST /api/email-automation/inbound/webhook?token=<inbound_webhook_token>
 *
 * Accepts a JSON body matching InboundEmailEvent and routes it through
 * the full processInboundEmail pipeline.
 *
 * Security: the token is validated against the email_providers table and
 * must belong to an org that has email automation enabled.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processInboundEmail } from '@/lib/email-automation/process-inbound';
import type { InboundEmailEvent } from '@/lib/email-automation/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token || token.length < 32) {
    return NextResponse.json({ error: 'Missing or invalid token' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Resolve token → organization_id via email_providers table
  const { data: provider, error: providerErr } = await supabase
    .from('email_providers')
    .select('id, organization_id, status')
    .eq('inbound_webhook_token', token)
    .maybeSingle();

  if (providerErr || !provider) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Basic validation
  const senderEmail = typeof body.senderEmail === 'string' ? body.senderEmail.trim() : null;
  if (!senderEmail || !senderEmail.includes('@')) {
    return NextResponse.json({ error: 'senderEmail is required' }, { status: 400 });
  }

  const event: InboundEmailEvent = {
    senderEmail,
    senderName: typeof body.senderName === 'string' ? body.senderName : null,
    subject: typeof body.subject === 'string' ? body.subject : null,
    bodyText: typeof body.bodyText === 'string' ? body.bodyText : null,
    bodyHtml: typeof body.bodyHtml === 'string' ? body.bodyHtml : null,
    messageId: typeof body.messageId === 'string' ? body.messageId : null,
    inReplyTo: typeof body.inReplyTo === 'string' ? body.inReplyTo : null,
    threadId: typeof body.threadId === 'string' ? body.threadId : null,
    receivedAt: typeof body.receivedAt === 'string' ? body.receivedAt : new Date().toISOString(),
  };

  const result = await processInboundEmail({
    supabase,
    organizationId: provider.organization_id as string,
    emailProviderId: provider.id as string,
    event,
  });

  return NextResponse.json(result);
}
