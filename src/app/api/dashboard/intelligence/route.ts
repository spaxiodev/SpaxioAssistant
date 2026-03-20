/**
 * GET /api/dashboard/intelligence
 *
 * Live dashboard intelligence endpoint. Returns:
 * - High-priority leads (recent, unreviewed)
 * - Pending quote requests
 * - AI suggestions (synced lazily)
 * - Conversation + lead signal summary
 * - Recommended next actions
 *
 * Used by Simple Mode dashboard for the live intelligence panel.
 * All data is org-scoped and respects entitlements.
 */
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { requireOrg } from '@/lib/api-org-auth';
import { syncSuggestionsForOrg } from '@/lib/ai-suggestions/sync-suggestions';
import { getEntitlements } from '@/lib/entitlements';

export type HighPriorityLead = {
  id: string;
  name: string;
  email: string;
  qualification_priority: string;
  qualification_score: number | null;
  qualification_summary: string | null;
  next_recommended_action: string | null;
  requested_service: string | null;
  created_at: string;
};

export type PendingQuoteRequest = {
  id: string;
  name: string;
  email: string;
  service_type: string | null;
  status: string;
  created_at: string;
};

export type IntelligenceSignal = {
  type: 'high_priority_lead' | 'pending_quote' | 'new_lead' | 'active_conversation' | 'setup_gap';
  label: string;
  count?: number;
  href: string;
};

export type DashboardIntelligenceResponse = {
  high_priority_leads: HighPriorityLead[];
  pending_quotes: PendingQuoteRequest[];
  signals: IntelligenceSignal[];
  suggestions: Array<{
    id: string;
    suggestion_type: string;
    title: string;
    description: string;
    action_href: string | null;
    action_label: string | null;
    priority: number;
  }>;
  stats: {
    total_leads: number;
    leads_last_7d: number;
    high_priority_leads: number;
    pending_quotes: number;
    conversations_last_7d: number;
    conversion_rate_pct: number | null;
  };
  suggestions_enabled: boolean;
  lead_scoring_enabled: boolean;
};

export async function GET() {
  try {
    const auth = await requireOrg();
    if (!auth.ok) return auth.response;
    const { organizationId, supabase, adminAllowed } = auth;

    const { entitlements } = await getEntitlements(supabase, organizationId);
    const leadScoringEnabled = entitlements.ai_lead_scoring_enabled || adminAllowed;
    const suggestionsEnabled = entitlements.ai_suggestions_enabled || adminAllowed;

    const since7 = new Date();
    since7.setDate(since7.getDate() - 7);
    const sinceIso7 = since7.toISOString();

    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);
    const sinceIso30 = since30.toISOString();

    // Fetch data in parallel
    const [
      highPriorityLeadsRes,
      pendingQuotesRes,
      totalLeadsRes,
      leads7dRes,
      pendingQuoteCountRes,
      widgetsRes,
    ] = await Promise.all([
      // High-priority leads (recent 30 days, limit 5 for UI)
      supabase
        .from('leads')
        .select('id, name, email, qualification_priority, qualification_score, qualification_summary, next_recommended_action, requested_service, created_at')
        .eq('organization_id', organizationId)
        .eq('qualification_priority', 'high')
        .gte('created_at', sinceIso30)
        .order('created_at', { ascending: false })
        .limit(5),

      // Pending quote requests (recent 30 days)
      supabase
        .from('quote_requests')
        .select('id, name, email, service_type, status, created_at')
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5),

      // Total leads count
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId),

      // Leads last 7 days
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', sinceIso7),

      // Pending quote count
      supabase
        .from('quote_requests')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'pending'),

      // Widgets (for conversation count)
      supabase
        .from('widgets')
        .select('id')
        .eq('organization_id', organizationId),
    ]);

    const widgetIds = (widgetsRes.data ?? []).map((w) => w.id);

    // Conversations last 7d
    let conv7d = 0;
    if (widgetIds.length > 0) {
      const { count } = await supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .in('widget_id', widgetIds)
        .gte('created_at', sinceIso7);
      conv7d = count ?? 0;
    }

    const totalLeads = totalLeadsRes.count ?? 0;
    const leads7d = leads7dRes.count ?? 0;
    const highPriorityLeads = highPriorityLeadsRes.data ?? [];
    const pendingQuotes = pendingQuotesRes.data ?? [];
    const pendingQuoteCount = pendingQuoteCountRes.count ?? 0;

    // Conversion rate: leads last 30d / conversations last 30d
    let conversionRatePct: number | null = null;
    if (widgetIds.length > 0) {
      const [conv30dRes, leads30dRes] = await Promise.all([
        supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .in('widget_id', widgetIds)
          .gte('created_at', sinceIso30),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .gte('created_at', sinceIso30),
      ]);
      const conv30d = conv30dRes.count ?? 0;
      const leads30d = leads30dRes.count ?? 0;
      if (conv30d > 0 && leads30d > 0) {
        conversionRatePct = Math.min(100, Math.round((leads30d / conv30d) * 100));
      }
    }

    // Build signals (surface what matters most)
    const signals: IntelligenceSignal[] = [];

    if (highPriorityLeads.length > 0) {
      signals.push({
        type: 'high_priority_lead',
        label: `${highPriorityLeads.length} high-priority lead${highPriorityLeads.length > 1 ? 's' : ''} this month`,
        count: highPriorityLeads.length,
        href: '/dashboard/leads',
      });
    }

    if (pendingQuoteCount > 0) {
      signals.push({
        type: 'pending_quote',
        label: `${pendingQuoteCount} quote request${pendingQuoteCount > 1 ? 's' : ''} pending review`,
        count: pendingQuoteCount,
        href: '/dashboard/quote-requests',
      });
    }

    if (leads7d > 0) {
      signals.push({
        type: 'new_lead',
        label: `${leads7d} new lead${leads7d > 1 ? 's' : ''} in the last 7 days`,
        count: leads7d,
        href: '/dashboard/leads',
      });
    }

    if (conv7d > 0) {
      signals.push({
        type: 'active_conversation',
        label: `${conv7d} conversation${conv7d > 1 ? 's' : ''} in the last 7 days`,
        count: conv7d,
        href: '/dashboard/conversations',
      });
    }

    // Sync and return AI suggestions
    let suggestions: DashboardIntelligenceResponse['suggestions'] = [];
    if (suggestionsEnabled) {
      try {
        const synced = await syncSuggestionsForOrg(supabase, organizationId);
        suggestions = synced.map((s) => ({
          id: s.id,
          suggestion_type: s.suggestion_type,
          title: s.title,
          description: s.description,
          action_href: s.action_href ?? null,
          action_label: s.action_label ?? null,
          priority: s.priority,
        }));
      } catch {
        // Suggestions are best-effort; don't fail the whole endpoint
        suggestions = [];
      }
    }

    const response: DashboardIntelligenceResponse = {
      high_priority_leads: highPriorityLeads as HighPriorityLead[],
      pending_quotes: pendingQuotes as PendingQuoteRequest[],
      signals,
      suggestions,
      stats: {
        total_leads: totalLeads,
        leads_last_7d: leads7d,
        high_priority_leads: highPriorityLeads.length,
        pending_quotes: pendingQuoteCount,
        conversations_last_7d: conv7d,
        conversion_rate_pct: conversionRatePct,
      },
      suggestions_enabled: suggestionsEnabled,
      lead_scoring_enabled: leadScoringEnabled,
    };

    return NextResponse.json(response);
  } catch (err) {
    return handleApiError(err, 'dashboard/intelligence');
  }
}
