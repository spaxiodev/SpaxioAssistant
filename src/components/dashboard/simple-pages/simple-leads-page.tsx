'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  SimplePageHeader,
  SimpleEmptyState,
  SimpleDeveloperModeLink,
  BlockingGuidancePanel,
  MilestoneSuccessPanel,
  SimpleSetupSkeleton,
} from '@/components/dashboard/simple';
import { useViewMode } from '@/contexts/view-mode-context';
import { useNextBestAction } from '@/hooks/use-next-best-action';
import { formatDate } from '@/lib/utils';

const INTENT_STORAGE_KEY = 'spaxio-ai-setup-intent';

type Lead = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  created_at: string;
  qualification_priority?: string | null;
  qualification_summary?: string | null;
  requested_service?: string | null;
};

function priorityLabel(priority: string | null | undefined): string {
  if (!priority) return '';
  switch (priority) {
    case 'high':
      return 'Hot lead';
    case 'medium':
      return 'Follow up';
    case 'low':
      return 'Needs follow-up';
    default:
      return priority;
  }
}

export function SimpleLeadsPage() {
  const router = useRouter();
  const { setMode } = useViewMode();
  const { data: nextActionData, isLoading: loadingNextAction } = useNextBestAction();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const widgetReady = nextActionData?.progress?.widgetReadyDone ?? true;
  const showBlocking = !loadingNextAction && !loading && !widgetReady;
  const isFirstLead = leads.length === 1;

  const openInDeveloperMode = (path: string) => {
    setMode('developer');
    router.push(path);
  };

  useEffect(() => {
    let cancelled = false;
    fetch('/api/leads?limit=50')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setLeads(Array.isArray(data.leads) ? data.leads : []);
      })
      .catch(() => {
        if (!cancelled) setLeads([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const goToAiSetup = (prompt: string) => {
    try {
      window.localStorage.setItem(INTENT_STORAGE_KEY, prompt);
    } catch {
      // ignore
    }
    router.push('/dashboard/ai-setup');
  };

  return (
    <div className="space-y-8">
      <SimplePageHeader
        title="Leads"
        description="People who shared their contact info through your assistant. Follow up from here or open the full view for more options."
        icon={<Users className="h-6 w-6" />}
      />

      {showBlocking && (
        <BlockingGuidancePanel
          title="Set up your assistant first"
          description="Leads appear when visitors share their contact info through your chat. Set up your assistant in AI Setup, install the widget, then return here to see leads."
          primaryAction={{ label: 'Go to AI Setup', href: '/dashboard/ai-setup' }}
          secondaryAction={{ label: 'Install widget', href: '/dashboard/install' }}
          icon={Sparkles}
        />
      )}

      {!showBlocking && (
        <>
          {leads.length === 1 && (
            <MilestoneSuccessPanel
              headline="First lead received!"
              description="Someone shared their contact info through your assistant. Keep the momentum going—review and follow up."
              nextStep={{ label: 'View lead details', href: '/dashboard/leads' }}
            />
          )}
          {/* Lead list */}
          <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent leads</CardTitle>
          <CardDescription>
            {loading
              ? 'Loading…'
              : leads.length === 0
                ? 'Leads appear when visitors share their name and email. Make sure lead capture is set up in AI Setup.'
                : `${leads.length} lead(s)`}
          </CardDescription>
        </CardHeader>
        {loading && (
          <CardContent className="py-8">
            <SimpleSetupSkeleton lines={5} />
          </CardContent>
        )}
        {!loading && leads.length > 0 && (
          <CardContent>
            <ul className="space-y-3">
              {leads.map((lead) => (
                <li
                  key={lead.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg border bg-muted/30 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{lead.name}</span>
                      {lead.qualification_priority && (
                        <Badge
                          variant={lead.qualification_priority === 'high' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {priorityLabel(lead.qualification_priority)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{lead.email}</p>
                    {lead.requested_service && (
                      <p className="text-xs text-muted-foreground mt-1">Service: {lead.requested_service}</p>
                    )}
                    {lead.qualification_summary && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{lead.qualification_summary}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(lead.created_at)}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openInDeveloperMode(`/dashboard/leads?lead=${lead.id}`)}
                  >
                    View details
                  </Button>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => openInDeveloperMode('/dashboard/leads')}
            >
              Open full leads view
            </Button>
          </CardContent>
        )}
        {!loading && leads.length === 0 && (
          <CardContent>
            <SimpleEmptyState
              icon={<Users className="h-10 w-10" />}
              title="No leads yet"
              description="When visitors share their contact info through your assistant, they'll appear here. Set up lead capture in AI Setup to get started."
              action={{
                label: 'Set up lead capture',
                onClick: () =>
                  goToAiSetup(
                    'Set up lead capture. When visitors want to be contacted, collect name, email, and what they need.'
                  ),
              }}
              secondaryAction={{
                label: 'Go to AI Setup',
                onClick: () => router.push('/dashboard/ai-setup'),
              }}
              showDeveloperModeSwitch={true}
            />
          </CardContent>
        )}
      </Card>
        </>
      )}

      <SimpleDeveloperModeLink
        developerPath="/dashboard/leads"
        linkLabel="Open Leads in Developer Mode"
      />
    </div>
  );
}
