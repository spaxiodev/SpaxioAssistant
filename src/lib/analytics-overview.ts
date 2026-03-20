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
  // Core lead/quote/conversation metrics (always available)
  leads: {
    total: number;
    last_30d: number;
    high_priority: number;
    medium_priority: number;
    low_priority: number;
    unqualified: number;
    avg_score: number | null;
    top_services: string[];
  };
  quote_requests: {
    total: number;
    last_30d: number;
    pending: number;
    reviewed: number;
  };
  conversations: {
    total: number;
    last_30d: number;
    last_7d: number;
    with_leads: number;
    conversion_rate_pct: number | null;
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
  const now = new Date();
  const since30 = new Date(now);
  since30.setDate(since30.getDate() - 30);
  const since7 = new Date(now);
  since7.setDate(since7.getDate() - 7);
  const sinceIso30 = since30.toISOString();
  const sinceIso7 = since7.toISOString();

  const { data: widgets } = await supabase
    .from('widgets')
    .select('id')
    .eq('organization_id', organizationId);
  const widgetIds = (widgets ?? []).map((w) => w.id);

  // Run all queries in parallel for performance
  const [
    actionsRes,
    inboxConvRes,
    escalationsRes,
    bookingsRes,
    voiceRes,
    leadsAllRes,
    leads30dRes,
    leadsHighRes,
    leadsMedRes,
    leadsLowRes,
    leadsUnqualifiedRes,
    leadsScoreRes,
    leadsServicesRes,
    quoteAllRes,
    quote30dRes,
    quotePendingRes,
    quoteReviewedRes,
    conv30dRes,
    conv7dRes,
  ] = await Promise.all([
    // Actions
    entitlements.actionsEnabled
      ? supabase.from('action_invocations').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).gte('created_at', sinceIso30)
      : Promise.resolve({ count: 0 }),

    // Inbox conversations
    widgetIds.length > 0 && entitlements.inboxEnabled
      ? supabase.from('conversations').select('id, status', { count: 'exact' }).in('widget_id', widgetIds)
      : Promise.resolve({ data: [], count: 0 }),

    // Escalations
    widgetIds.length > 0 && entitlements.inboxEnabled
      ? supabase.from('escalation_events').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'pending')
      : Promise.resolve({ count: 0 }),

    // Bookings
    entitlements.bookingsEnabled
      ? supabase.from('bookings').select('id, status', { count: 'exact' }).eq('organization_id', organizationId).gte('created_at', sinceIso30)
      : Promise.resolve({ data: [], count: 0 }),

    // Voice
    entitlements.voiceEnabled
      ? supabase.from('voice_sessions').select('id, duration_seconds').eq('organization_id', organizationId).gte('started_at', sinceIso30)
      : Promise.resolve({ data: [] }),

    // Leads - total
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    // Leads - last 30d
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).gte('created_at', sinceIso30),
    // Leads - high priority
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('qualification_priority', 'high'),
    // Leads - medium priority
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('qualification_priority', 'medium'),
    // Leads - low priority
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('qualification_priority', 'low'),
    // Leads - unqualified (null priority)
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).is('qualification_priority', null),
    // Leads - scores for avg
    supabase.from('leads').select('qualification_score').eq('organization_id', organizationId).not('qualification_score', 'is', null).limit(200),
    // Leads - top services
    supabase.from('leads').select('requested_service').eq('organization_id', organizationId).not('requested_service', 'is', null).limit(100),
    // Quote requests - total
    supabase.from('quote_requests').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    // Quote requests - last 30d
    supabase.from('quote_requests').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).gte('created_at', sinceIso30),
    // Quote requests - pending
    supabase.from('quote_requests').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'pending'),
    // Quote requests - reviewed/responded
    supabase.from('quote_requests').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).in('status', ['reviewed', 'responded', 'closed']),
    // Conversations last 30d
    widgetIds.length > 0
      ? supabase.from('conversations').select('id', { count: 'exact', head: true }).in('widget_id', widgetIds).gte('created_at', sinceIso30)
      : Promise.resolve({ count: 0 }),
    // Conversations last 7d
    widgetIds.length > 0
      ? supabase.from('conversations').select('id', { count: 'exact', head: true }).in('widget_id', widgetIds).gte('created_at', sinceIso7)
      : Promise.resolve({ count: 0 }),
  ]);

  // Actions
  const actionCount = (actionsRes as { count?: number | null }).count ?? 0;

  // Inbox
  const inboxConvData = (inboxConvRes as { data?: unknown[]; count?: number | null });
  const inboxTotal = inboxConvData.count ?? 0;
  const inboxOpen = (inboxConvData.data ?? []).filter((c) => (c as { status: string }).status === 'open').length;
  const escalationsPending = (escalationsRes as { count?: number | null }).count ?? 0;

  // Bookings
  const bookingsData = (bookingsRes as { data?: unknown[]; count?: number | null });
  const bookingsTotal = bookingsData.count ?? 0;
  const bookingsScheduled = (bookingsData.data ?? []).filter(
    (b) => (b as { status: string }).status === 'scheduled' || (b as { status: string }).status === 'confirmed'
  ).length;

  // Voice
  const voiceSessions = (voiceRes as { data?: unknown[] }).data ?? [];
  const voiceSessionCount = voiceSessions.length;
  const voiceMinutes = voiceSessions.reduce(
    (sum: number, s) => sum + Math.round(((s as { duration_seconds: number | null }).duration_seconds ?? 0) / 60),
    0
  );

  // Leads
  const leadsTotal = (leadsAllRes as { count?: number | null }).count ?? 0;
  const leads30d = (leads30dRes as { count?: number | null }).count ?? 0;
  const leadsHigh = (leadsHighRes as { count?: number | null }).count ?? 0;
  const leadsMed = (leadsMedRes as { count?: number | null }).count ?? 0;
  const leadsLow = (leadsLowRes as { count?: number | null }).count ?? 0;
  const leadsUnqualified = (leadsUnqualifiedRes as { count?: number | null }).count ?? 0;

  const scoreData = (leadsScoreRes as { data?: unknown[] }).data ?? [];
  const scores = scoreData
    .map((r) => (r as { qualification_score?: unknown }).qualification_score)
    .filter((s): s is number => typeof s === 'number' && Number.isFinite(s));
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const servicesData = (leadsServicesRes as { data?: unknown[] }).data ?? [];
  const serviceCounts: Record<string, number> = {};
  for (const r of servicesData) {
    const svc = (r as { requested_service?: string | null }).requested_service;
    if (svc) serviceCounts[svc] = (serviceCounts[svc] ?? 0) + 1;
  }
  const topServices = Object.entries(serviceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([s]) => s);

  // Quote requests
  const quoteTotal = (quoteAllRes as { count?: number | null }).count ?? 0;
  const quote30d = (quote30dRes as { count?: number | null }).count ?? 0;
  const quotePending = (quotePendingRes as { count?: number | null }).count ?? 0;
  const quoteReviewed = (quoteReviewedRes as { count?: number | null }).count ?? 0;

  // Conversations
  const conv30d = (conv30dRes as { count?: number | null }).count ?? 0;
  const conv7d = (conv7dRes as { count?: number | null }).count ?? 0;

  // Conversation-to-lead conversion rate (last 30d)
  const conversionRatePct =
    conv30d > 0 && leads30d > 0
      ? Math.min(100, Math.round((leads30d / conv30d) * 100))
      : null;

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
      sessions_last_30d: voiceSessionCount,
      minutes_last_30d: voiceMinutes,
    },
    leads: {
      total: leadsTotal,
      last_30d: leads30d,
      high_priority: leadsHigh,
      medium_priority: leadsMed,
      low_priority: leadsLow,
      unqualified: leadsUnqualified,
      avg_score: avgScore,
      top_services: topServices,
    },
    quote_requests: {
      total: quoteTotal,
      last_30d: quote30d,
      pending: quotePending,
      reviewed: quoteReviewed,
    },
    conversations: {
      total: inboxTotal + conv30d,
      last_30d: conv30d,
      last_7d: conv7d,
      with_leads: leads30d,
      conversion_rate_pct: conversionRatePct,
    },
  };
}
