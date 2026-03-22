import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { twilioFormToRecord } from '@/lib/communications/twilio-form';
import { verifyTwilioRequest, getTwilioWebhookUrl } from '@/lib/communications/twilio-verify';

export const dynamic = 'force-dynamic';

/**
 * Inbound voice webhook (TwiML). Scaffold: polite AI disclosure + hangup.
 * Real-time speech pipeline can replace the TwiML response later.
 */
export async function POST(request: Request) {
  const body = await twilioFormToRecord(request);
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const skipVerify = process.env.TWILIO_SKIP_SIGNATURE_VERIFY === 'true';
  if (authToken && !skipVerify) {
    const sig = request.headers.get('x-twilio-signature');
    const url = getTwilioWebhookUrl(request);
    if (!verifyTwilioRequest({ authToken, signature: sig, url, body })) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  const callSid = body.CallSid ?? '';
  const from = body.From ?? '';
  const to = body.To ?? '';

  const supabase = createAdminClient();
  const { data: numberRow } = await supabase
    .from('phone_numbers')
    .select('organization_id')
    .eq('phone_number', to)
    .eq('is_active', true)
    .maybeSingle();

  const orgId = numberRow?.organization_id;
  let businessName = 'this business';
  if (orgId) {
    const { data: settings } = await supabase
      .from('business_settings')
      .select('business_name')
      .eq('organization_id', orgId)
      .maybeSingle();
    if (settings?.business_name?.trim()) businessName = settings.business_name.trim();

    const { data: aiVoice } = await supabase
      .from('ai_channel_settings')
      .select('enabled')
      .eq('organization_id', orgId)
      .eq('channel_type', 'voice_call')
      .maybeSingle();

    if (callSid && orgId) {
      await supabase.from('call_sessions').insert({
        organization_id: orgId,
        provider_call_id: callSid,
        from_number: from,
        to_number: to,
        disposition: 'answered_scaffold',
        handoff_status: aiVoice?.enabled ? 'ai_ready' : 'disabled',
      });
      await supabase.from('communication_events').insert({
        organization_id: orgId,
        event_type: 'voice_inbound',
        payload_json: { call_sid: callSid, from, to },
      });
    }
  }

  const safeName = escapeXml(businessName);
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Thanks for calling ${safeName}. You are speaking with an automated A I assistant, not a human. We are rolling out full phone answering soon. Please send a text or leave a message with your email, and our team will follow up.</Say>
  <Pause length="1"/>
  <Say language="fr-FR" voice="Polly.Celine">Merci d'avoir appelé. Vous parlez avec une assistante I A automatisée. Envoyez un texto ou laissez votre courriel; notre équipe vous recontactera.</Say>
  <Hangup/>
</Response>`;

  return new NextResponse(twiml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
