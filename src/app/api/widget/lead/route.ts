import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getClientIp, isUuid, normalizeUuid } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { emitAutomationEvent } from '@/lib/automations/engine';
import { canUseAutomation } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function getResend() {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

function sanitize(s: unknown): string {
  if (s == null) return '';
  return String(s).slice(0, 2000);
}

const withCors = (body: object, status: number) =>
  NextResponse.json(body, { status, headers: corsHeaders });

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json().catch(() => ({}));
    const rawWidgetId = body.widgetId;
    const rawConversationId = body.conversationId ?? null;
    const widgetId = rawWidgetId ? normalizeUuid(String(rawWidgetId)) : '';
    let conversationId: string | null = null;
    if (rawConversationId && typeof rawConversationId === 'string') {
      const candidate = normalizeUuid(rawConversationId);
      if (isUuid(candidate)) conversationId = candidate;
    }

    const name = sanitize(body.name).slice(0, 500);
    const email = sanitize(body.email).slice(0, 255);
    const phone = sanitize(body.phone).slice(0, 50);
    const message = sanitize(body.message);
    const requestedService = sanitize(body.requestedService).slice(0, 500);
    const transcriptSnippet = sanitize(body.transcriptSnippet).slice(0, 2000);
    const requestedTimeline = sanitize(body.requestedTimeline ?? body.requested_timeline).slice(0, 500);
    const projectDetails = sanitize(body.projectDetails ?? body.project_details).slice(0, 2000);
    const location = sanitize(body.location).slice(0, 500);

    if (!rawWidgetId || !name || !email) {
      return withCors({ error: 'Missing required fields' }, 400);
    }
    if (!isUuid(widgetId)) {
      return withCors({ error: 'Invalid widgetId' }, 400);
    }

    const perIpKey = `widget-lead:ip:${ip}`;
    const rl = rateLimit({ key: perIpKey, limit: 30, windowMs: 60_000 });
    if (!rl.allowed) {
      return withCors({ error: 'Too many requests' }, 429);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return withCors({ error: 'Invalid email' }, 400);
    }

    const supabase = createAdminClient();
    const { data: widget, error: widgetError } = await supabase
      .from('widgets')
      .select('id, organization_id')
      .eq('id', widgetId)
      .single();

    if (widgetError || !widget) {
      return withCors({ error: 'Widget not found' }, 404);
    }

    const { data: lead } = await supabase
      .from('leads')
      .insert({
        organization_id: widget.organization_id,
        conversation_id: conversationId,
        name,
        email,
        phone: phone || null,
        message: message || null,
        transcript_snippet: transcriptSnippet || null,
        requested_service: requestedService || null,
        requested_timeline: requestedTimeline || null,
        project_details: projectDetails || null,
        location: location || null,
      })
      .select('id')
      .single();

    if (!lead) {
      return withCors({ error: 'Failed to save lead' }, 500);
    }

    // Event-driven automations: emit lead_form_submitted so active automations can run
    const adminAllowed = await isOrgAllowedByAdmin(supabase, widget.organization_id);
    const automationsAllowed = await canUseAutomation(supabase, widget.organization_id, adminAllowed);
    if (automationsAllowed) {
      const traceId = `lead-${lead.id}`;
      emitAutomationEvent(supabase, {
        organization_id: widget.organization_id,
        event_type: 'lead_form_submitted',
        payload: {
          trigger_type: 'lead_form_submitted',
          conversation_id: conversationId ?? undefined,
          lead: {
            name,
            email,
            phone: phone || undefined,
            message: message || undefined,
          },
          lead_id: lead.id,
        },
        trace_id: traceId,
        source: 'widget_lead',
        actor: { type: 'lead', id: lead.id, email },
      }).catch((err) => {
        console.error('[widget/lead] automation emit failed', err);
      });
    }

    const { data: settings } = await supabase
      .from('business_settings')
      .select('lead_notification_email, contact_email, business_name')
      .eq('organization_id', widget.organization_id)
      .single();

    const to = settings?.lead_notification_email || settings?.contact_email;
    const resend = getResend();
    if (to && resend) {
      // Resend does not allow sending FROM Gmail/Yahoo etc. — only verified domains. Use fallback if needed.
      const rawFrom = process.env.RESEND_FROM_EMAIL || '';
      const freeEmailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com', 'icloud.com'];
      const fromDomain = rawFrom.includes('@') ? rawFrom.split('@')[1]?.toLowerCase() : '';
      const isFreeEmail = fromDomain ? freeEmailDomains.some((d) => fromDomain === d || fromDomain.endsWith('.' + d)) : false;
      const from = rawFrom && !isFreeEmail ? rawFrom : 'Spaxio Assistant <onboarding@resend.dev>';

      const { error: sendError } = await resend.emails.send({
        from,
        to: [to],
        subject: `New lead from ${settings?.business_name || 'your website'}: ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || '—'}\nService: ${requestedService || '—'}\nTimeline: ${requestedTimeline || '—'}\nProject details: ${projectDetails || '—'}\nLocation: ${location || '—'}\n\nMessage:\n${message || '—'}\n\nTranscript snippet:\n${transcriptSnippet || '—'}`,
      });
      if (sendError) {
        console.error('[widget/lead] Resend error:', sendError);
      }
    }

    return withCors({ success: true, leadId: lead.id }, 200);
  } catch (err) {
    const res = handleApiError(err, 'widget/lead');
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
}
