/**
 * CTA (call-to-action) trigger endpoint for automation events.
 * Embeddable CTAs (Get Pricing, Request Quote, Talk to Sales, Ask for Help) can POST here
 * with widgetId + cta_label to emit cta_clicked for matching automations.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { getClientIp, isUuid, normalizeUuid } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { emitAutomationEvent } from '@/lib/automations/engine';
import { canUseAutomation } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { handleApiError } from '@/lib/api-error';

const CTA_LABELS = ['get_pricing', 'request_quote', 'talk_to_sales', 'ask_for_help', 'contact'] as const;

function sanitize(s: unknown, max: number): string {
  if (s == null) return '';
  return String(s).slice(0, max);
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json().catch(() => ({}));

    const rawWidgetId = body.widgetId ?? body.widget_id ?? null;
    const widgetId = rawWidgetId ? normalizeUuid(String(rawWidgetId)) : null;
    if (!widgetId || !isUuid(widgetId)) {
      return NextResponse.json(
        { error: 'Missing or invalid widgetId', code: 'validation_error' },
        { status: 400 }
      );
    }

    const rawLabel = body.cta_label ?? body.cta ?? body.label ?? 'contact';
    const ctaLabel = CTA_LABELS.includes(rawLabel as (typeof CTA_LABELS)[number])
      ? rawLabel
      : sanitize(rawLabel, 64).toLowerCase().replace(/\s+/g, '_') || 'contact';

    const perKey = `automations-cta:${widgetId}:${ip.slice(0, 24)}`;
    const rl = rateLimit({ key: perKey, limit: 60, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = createAdminClient();
    const { data: widget, error: widgetError } = await supabase
      .from('widgets')
      .select('id, organization_id')
      .eq('id', widgetId)
      .single();

    if (widgetError || !widget) {
      return NextResponse.json({ error: 'Widget not found' }, { status: 404 });
    }

    const adminAllowed = await isOrgAllowedByAdmin(supabase, widget.organization_id);
    const allowed = await canUseAutomation(supabase, widget.organization_id, adminAllowed);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Automations not available for this workspace' },
        { status: 403 }
      );
    }

    const lead = body.lead && typeof body.lead === 'object'
      ? {
          name: sanitize(body.lead.name, 500),
          email: sanitize(body.lead.email, 255),
          phone: sanitize(body.lead.phone, 50),
          message: sanitize(body.lead.message, 2000),
        }
      : undefined;

    await emitAutomationEvent(supabase, {
      organization_id: widget.organization_id,
      event_type: 'cta_clicked',
      payload: {
        trigger_type: 'cta_clicked',
        cta_label: ctaLabel,
        source: sanitize(body.source, 100) || 'cta',
        lead,
        page_url: sanitize(body.page_url ?? body.url, 500),
      },
      source: 'cta',
      metadata: { cta_label: ctaLabel },
    });

    return NextResponse.json({ ok: true, cta_label: ctaLabel });
  } catch (err) {
    return handleApiError(err, 'automations/cta/POST');
  }
}
