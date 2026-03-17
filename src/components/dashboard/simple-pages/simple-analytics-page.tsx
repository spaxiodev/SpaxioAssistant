'use client';

import { useState, useEffect } from 'react';
import { BarChart3, MessageSquare, Users, Zap, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  SimplePageHeader,
  SimpleStatusCard,
  SimpleDeveloperModeLink,
} from '@/components/dashboard/simple';

type Overview = {
  actions?: { enabled: boolean; invocations_last_30d: number };
  inbox?: {
    enabled: boolean;
    conversations_total: number;
    conversations_open: number;
    escalations_pending: number;
  };
  bookings?: { enabled: boolean; total_last_30d: number; scheduled_or_confirmed: number };
  voice?: { enabled: boolean; sessions_last_30d: number; minutes_last_30d: number };
};

export function SimpleAnalyticsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [leadsCount, setLeadsCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetch('/api/analytics/overview'), fetch('/api/leads?limit=500')])
      .then(([analyticsRes, leadsRes]) => Promise.all([analyticsRes.json(), leadsRes.json()]))
      .then(([analytics, leadsData]) => {
        if (cancelled) return;
        setOverview(analytics);
        setLeadsCount(Array.isArray(leadsData.leads) ? leadsData.leads.length : 0);
      })
      .catch(() => {
        if (!cancelled) {
          setOverview(null);
          setLeadsCount(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <SimplePageHeader
        title="How your assistant is helping"
        description="What happened this week and this month: leads captured, conversations, and AI actions."
        icon={<BarChart3 className="h-6 w-6" />}
      />

      {loading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Loading…</CardContent>
        </Card>
      )}

      {!loading && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {leadsCount !== null && (
              <SimpleStatusCard
                title="Leads captured"
                value={leadsCount}
                subtitle="Total in your account"
                icon={<Users className="h-4 w-4" />}
              />
            )}
            {overview?.inbox && (
              <>
                <SimpleStatusCard
                  title="Conversations"
                  value={overview.inbox.conversations_total}
                  subtitle={`${overview.inbox.conversations_open} open`}
                  icon={<MessageSquare className="h-4 w-4" />}
                />
                {overview.inbox.escalations_pending > 0 && (
                  <SimpleStatusCard
                    title="Needs attention"
                    value={overview.inbox.escalations_pending}
                    subtitle="Pending escalations"
                    icon={<MessageSquare className="h-4 w-4" />}
                    variant="muted"
                  />
                )}
              </>
            )}
            {overview?.actions && (
              <SimpleStatusCard
                title="AI actions (30 days)"
                value={overview.actions.invocations_last_30d}
                subtitle="Summaries, follow-ups, etc."
                icon={<Zap className="h-4 w-4" />}
              />
            )}
            {overview?.bookings && overview.bookings.enabled && (
              <SimpleStatusCard
                title="Bookings (30 days)"
                value={overview.bookings.total_last_30d}
                subtitle={`${overview.bookings.scheduled_or_confirmed} scheduled`}
                icon={<FileText className="h-4 w-4" />}
              />
            )}
            {overview?.voice && overview.voice.enabled && (
              <SimpleStatusCard
                title="Voice sessions (30 days)"
                value={overview.voice.sessions_last_30d}
                subtitle={`${overview.voice.minutes_last_30d} min`}
                icon={<BarChart3 className="h-4 w-4" />}
              />
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">What this means</CardTitle>
              <CardDescription>
                Leads are people who shared their contact info through your assistant. Conversations are chat threads. AI actions include summaries and follow-up suggestions. For detailed charts and filters, use Developer Mode.
              </CardDescription>
            </CardHeader>
          </Card>
        </>
      )}

      <SimpleDeveloperModeLink
        developerPath="/dashboard/analytics"
        linkLabel="Open Analytics in Developer Mode"
      />
    </div>
  );
}
