/**
 * Generic form submission endpoint for automation triggers.
 * Frontends or external sites can POST form data here; emits form_submitted for matching automations.
 * Optional: create_lead=true + name + email creates a lead record and includes lead_id in payload.
 * Authenticate via widgetId (public). Anti-abuse: rate limit by IP/widget.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { getClientIp, isUuid, normalizeUuid } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';
import { emitAutomationEvent } from '@/lib/automations/engine';
import { canUseAutomation } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { handleApiError } from '@/lib/api-error';

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

    const perKey = `automations-form:${widgetId}:${ip.slice(0, 24)}`;
    const rl = rateLimit({ key: perKey, limit: 30, windowMs: 60_000 });
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

    const fields = body.fields && typeof body.fields === 'object' ? body.fields : body;
    const name = sanitize(fields.name ?? fields.full_name, 500);
    const email = sanitize(fields.email, 255);
    const phone = sanitize(fields.phone, 50);
    const message = sanitize(fields.message ?? fields.comment ?? fields.notes, 2000);
    const sourceLabel = typeof body.source === 'string' ? body.source.slice(0, 100) : 'form';
    const createLead = body.create_lead === true || body.create_lead === 'true';

    let leadId: string | undefined;
    if (createLead && name && email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const { data: lead } = await supabase
        .from('leads')
        .insert({
          organization_id: widget.organization_id,
          name,
          email,
          phone: phone || null,
          message: message || null,
        })
        .select('id')
        .single();
      if (lead?.id) leadId = lead.id;
    }

    const lead = { name, email, phone: phone || undefined, message: message || undefined };
    await emitAutomationEvent(supabase, {
      organization_id: widget.organization_id,
      event_type: 'form_submitted',
      payload: {
        trigger_type: 'form_submitted',
        source: sourceLabel,
        lead,
        lead_id: leadId,
        fields: { ...fields },
      },
      source: `form:${sourceLabel}`,
    });

    return NextResponse.json({ ok: true, message: 'Received', lead_id: leadId });
  } catch (err) {
    return handleApiError(err, 'automations/form/POST');
  }
}
