'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Sparkles, MessageSquare, UserPlus, FileText, Flag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  SimplePageHeader,
  SimpleAiAssistPanel,
  SimpleEmptyState,
  SimpleDeveloperModeLink,
} from '@/components/dashboard/simple';
import { useViewMode } from '@/contexts/view-mode-context';
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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

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
        description="Review the people who contacted your business through the assistant. See status, add notes, or open the full conversation."
        icon={<Users className="h-6 w-6" />}
      />

      {/* Manual actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Mark as hot / follow up / closed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Change lead status in Developer Mode.</p>
            <Button variant="outline" size="sm" onClick={() => openInDeveloperMode('/dashboard/leads')}>
              Open leads
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Add note</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Add notes and follow-up in Developer Mode.</p>
            <Button variant="outline" size="sm" onClick={() => openInDeveloperMode('/dashboard/leads')}>
              Open leads
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Assign teammate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Assign leads in the inbox or Developer Mode.</p>
            <Button variant="outline" size="sm" onClick={() => openInDeveloperMode('/dashboard/inbox')}>
              Open inbox
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open conversation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">View full chat and create lead from inbox.</p>
            <Button variant="outline" size="sm" onClick={() => openInDeveloperMode('/dashboard/conversations')}>
              Open conversations
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Lead list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent leads</CardTitle>
          <CardDescription>
            {loading ? 'Loading…' : leads.length === 0 ? 'No leads yet. They’ll appear here when visitors share their contact info.' : `${leads.length} lead(s). Open in Developer Mode for full details and actions.`}
          </CardDescription>
        </CardHeader>
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
                    onClick={() => openInDeveloperMode('/dashboard/leads')}
                  >
                    View full lead
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        )}
        {!loading && leads.length === 0 && (
          <CardContent>
            <SimpleEmptyState
              icon={<Users className="h-10 w-10" />}
              title="No leads yet"
              description="Leads appear when visitors share their name and email through your assistant. Make sure lead capture is set up in AI Setup or Settings."
              action={{ label: 'Set up lead capture', onClick: () => goToAiSetup('Set up lead capture. When visitors want to be contacted, collect name, email, and what they need.') }}
              showDeveloperModeSwitch={true}
            />
          </CardContent>
        )}
      </Card>

      <SimpleAiAssistPanel
        title="AI can help"
        description="Summarize a lead, suggest next steps, or draft follow-up."
        actions={[
          { label: 'Summarize this lead', onClick: () => router.push('/dashboard/leads') },
          { label: 'Suggest next step', onClick: () => goToAiSetup('Suggest the best next step for following up with my leads.') },
          { label: 'Write follow-up email', onClick: () => goToAiSetup('Write a follow-up email template for my leads.') },
          { label: 'Score this lead', onClick: () => router.push('/dashboard/leads') },
        ]}
      />

      <SimpleDeveloperModeLink developerPath="/dashboard/leads" linkLabel="Open Leads in Developer Mode" />
    </div>
  );
}
