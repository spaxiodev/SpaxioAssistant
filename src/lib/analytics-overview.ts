/**
 * Server-side analytics overview for dashboard. Used by API and overview page.
 * All counts are org-scoped.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type AnalyticsOverview = {
  actions: { enabled: boolean; invocations_last_30d: number };
  inbox: {
    enabled: boolean;
    conversations_total: number;
    conversations_open: number;
    escalations_pending: number;
  };
  bookings: {
    enabled: boolean;
    total_last_30d: number;
    scheduled_or_confirmed: number;
  };
  voice: {
    enabled: boolean;
    sessions_last_30d: number;
    minutes_last_30d: number;
  };
};

export async function getAnalyticsOverview(
  supabase: SupabaseClient,
  organizationId: string,
  entitlements: {
    inboxEnabled: boolean;
    actionsEnabled: boolean;
    bookingsEnabled: boolean;
    voiceEnabled: boolean;
  }
): Promise<AnalyticsOverview> {
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceIso = since.toISOString();

  const { data: widgets } = await supabase
    .from('widgets')
    .select('id')
    .eq('organization_id', organizationId);
  const widgetIds = (widgets ?? []).map((w) => w.id);

  let actionCount = 0;
  if (entitlements.actionsEnabled) {
    const { count } = await supabase
      .from('action_invocations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', sinceIso);
    actionCount = count ?? 0;
  }

  let inboxTotal = 0;
  let inboxOpen = 0;
  let escalationsPending = 0;
  if (widgetIds.length > 0 && entitlements.inboxEnabled) {
    const [convRes, escRes] = await Promise.all([
      supabase
        .from('conversations')
        .select('id, status', { count: 'exact' })
        .in('widget_id', widgetIds),
      supabase
        .from('escalation_events')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'pending'),
    ]);
    inboxTotal = convRes.count ?? 0;
    inboxOpen = (convRes.data ?? []).filter((c) => (c as { status: string }).status === 'open').length;
    escalationsPending = escRes.count ?? 0;
  }

  let bookingsTotal = 0;
  let bookingsScheduled = 0;
  if (entitlements.bookingsEnabled) {
    const { data: bookings, count } = await supabase
      .from('bookings')
      .select('id, status', { count: 'exact' })
      .eq('organization_id', organizationId)
      .gte('created_at', sinceIso);
    bookingsTotal = count ?? 0;
    bookingsScheduled = (bookings ?? []).filter(
      (b) => (b as { status: string }).status === 'scheduled' || (b as { status: string }).status === 'confirmed'
    ).length;
  }

  let voiceSessions = 0;
  let voiceMinutes = 0;
  if (entitlements.voiceEnabled) {
    const { data: sessions } = await supabase
      .from('voice_sessions')
      .select('id, duration_seconds')
      .eq('organization_id', organizationId)
      .gte('started_at', sinceIso);
    voiceSessions = (sessions ?? []).length;
    voiceMinutes = (sessions ?? []).reduce(
      (sum, s) => sum + Math.round(((s as { duration_seconds: number | null }).duration_seconds ?? 0) / 60),
      0
    );
  }

  return {
    actions: { enabled: entitlements.actionsEnabled, invocations_last_30d: actionCount },
    inbox: {
      enabled: entitlements.inboxEnabled,
      conversations_total: inboxTotal,
      conversations_open: inboxOpen,
      escalations_pending: escalationsPending,
    },
    bookings: {
      enabled: entitlements.bookingsEnabled,
      total_last_30d: bookingsTotal,
      scheduled_or_confirmed: bookingsScheduled,
    },
    voice: {
      enabled: entitlements.voiceEnabled,
      sessions_last_30d: voiceSessions,
      minutes_last_30d: voiceMinutes,
    },
  };
}
