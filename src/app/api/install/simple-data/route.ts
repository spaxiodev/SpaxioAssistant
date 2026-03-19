/**
 * Returns install data for Simple Mode: widget script, base URL, widget ID, and preview info.
 * Used by the Simple Install page to show copy-paste code without switching to Developer Mode.
 */
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPublicAppUrl } from '@/lib/app-url';
import { routing } from '@/i18n/routing';

export async function GET() {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const headersList = await headers();
  const baseUrl = getPublicAppUrl({ headers: headersList }).replace(/\/$/, '');
  const locale = (headersList.get('x-next-intl-locale') ?? routing.defaultLocale) as 'en' | 'fr-CA';
  const widgetLocale = routing.locales.includes(locale) ? locale : routing.defaultLocale;

  const [{ data: widgets }, { data: agents }, { data: settings }] = await Promise.all([
    supabase.from('widgets').select('id, agent_id').eq('organization_id', orgId).order('created_at', { ascending: true }),
    supabase.from('agents').select('id, name').eq('organization_id', orgId).order('created_at', { ascending: false }),
    supabase.from('business_settings').select('widget_position_preset').eq('organization_id', orgId).single(),
  ]);

  const widgetByAgentId = new Map<string, string>();
  (widgets ?? []).forEach((w) => {
    if (w.agent_id) widgetByAgentId.set(w.agent_id, w.id);
  });
  const firstWidgetId = (widgets ?? [])[0]?.id ?? null;
  const firstAgent = (agents ?? [])[0];

  let scriptTag: string;
  let assistantName: string | null = null;

  if (firstAgent) {
    assistantName = firstAgent.name;
    const wId = widgetByAgentId.get(firstAgent.id);
    scriptTag = wId
      ? `<script src="${baseUrl}/widget.js" data-widget-id="${wId}"></script>`
      : `<script src="${baseUrl}/widget.js" data-agent-id="${firstAgent.id}"></script>`;
  } else {
    scriptTag = `<script src="${baseUrl}/widget.js" data-widget-id="YOUR_WIDGET_ID"></script>`;
  }

  const widgetPositionPreset = (settings as { widget_position_preset?: string } | null)?.widget_position_preset ?? 'bottom-right';

  return NextResponse.json({
    scriptTag,
    baseUrl,
    widgetId: firstWidgetId,
    assistantName,
    hasAgent: !!firstAgent,
    widgetLocale,
    widgetPositionPreset,
  });
}
