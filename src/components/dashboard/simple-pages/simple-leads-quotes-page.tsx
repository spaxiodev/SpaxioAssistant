'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Search, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  SimplePageHeader,
  SimpleEmptyState,
  SimpleDeveloperModeLink,
  SimpleSetupSkeleton,
} from '@/components/dashboard/simple';
import { useViewMode } from '@/contexts/view-mode-context';
import { formatDate } from '@/lib/utils';

type Lead = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  created_at: string;
  qualification_priority?: string | null;
  requested_service?: string | null;
};

type QuoteRequest = {
  id: string;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  service_type?: string | null;
  submission_source?: string | null;
  project_details?: string | null;
  created_at: string;
};

export function SimpleLeadsQuotesPage() {
  const router = useRouter();
  const { setMode } = useViewMode();
  const [tab, setTab] = useState('leads');
  const [q, setQ] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingQuotes, setLoadingQuotes] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/leads?limit=80')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setLeads(Array.isArray(data.leads) ? data.leads : []);
      })
      .catch(() => {
        if (!cancelled) setLeads([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingLeads(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/quote-requests?limit=80')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setQuotes(Array.isArray(data.quoteRequests) ? data.quoteRequests : []);
      })
      .catch(() => {
        if (!cancelled) setQuotes([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingQuotes(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openInDeveloperMode = (path: string) => {
    setMode('developer');
    router.push(path);
  };

  const needle = q.trim().toLowerCase();
  const filterLeads = leads.filter((l) => {
    if (!needle) return true;
    return (
      l.name.toLowerCase().includes(needle) ||
      l.email.toLowerCase().includes(needle) ||
      (l.phone ?? '').toLowerCase().includes(needle) ||
      (l.requested_service ?? '').toLowerCase().includes(needle)
    );
  });
  const filterQuotes = quotes.filter((r) => {
    if (!needle) return true;
    const blob = [r.customer_name, r.customer_email ?? '', r.service_type ?? '', r.project_details ?? '']
      .join(' ')
      .toLowerCase();
    return blob.includes(needle);
  });

  return (
    <div className="space-y-8">
      <SimplePageHeader
        title="Leads & quote requests"
        description="People who left contact or pricing details through your assistant. Follow up here or open the full CRM for tags, notes, and exports."
        icon={<Users className="h-6 w-6" />}
      />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="grid w-full max-w-md grid-cols-2 sm:w-auto">
            <TabsTrigger value="leads" className="gap-2">
              <Users className="h-4 w-4" />
              Leads
              {!loadingLeads && <Badge variant="secondary">{leads.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="quotes" className="gap-2">
              <FileText className="h-4 w-4" />
              Quotes
              {!loadingQuotes && <Badge variant="secondary">{quotes.length}</Badge>}
            </TabsTrigger>
          </TabsList>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, or service…"
              className="pl-9"
              aria-label="Search leads and quotes"
            />
          </div>
        </div>

        <TabsContent value="leads" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leads</CardTitle>
              <CardDescription>
                Visitors who shared contact info for follow-up. Status and notes are available in the full view.
              </CardDescription>
            </CardHeader>
            {loadingLeads ? (
              <CardContent className="py-8">
                <SimpleSetupSkeleton lines={5} />
              </CardContent>
            ) : filterLeads.length === 0 ? (
              <CardContent>
                <SimpleEmptyState
                  icon={<Users className="h-10 w-10" />}
                  title={needle ? 'No matching leads' : 'No leads yet'}
                  description={
                    needle
                      ? 'Try a different search.'
                      : 'When visitors share contact info through your assistant, they appear here.'
                  }
                  action={{
                    label: 'Review setup',
                    onClick: () => router.push('/dashboard/setup'),
                  }}
                />
              </CardContent>
            ) : (
              <CardContent>
                <ul className="space-y-3">
                  {filterLeads.map((lead) => (
                    <li
                      key={lead.id}
                      className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-border/60 bg-card/50 p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{lead.name}</span>
                          {lead.qualification_priority === 'high' && (
                            <Badge variant="default" className="text-xs">
                              Hot
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            Lead
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{lead.email}</p>
                        {lead.requested_service && (
                          <p className="mt-1 text-xs text-muted-foreground">Service: {lead.requested_service}</p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(lead.created_at)}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => openInDeveloperMode(`/dashboard/leads?lead=${lead.id}`)}>
                        View details
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="quotes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer quote requests</CardTitle>
              <CardDescription>
                Structured pricing or project inquiries. Open the full view to manage estimates and pricing rules.
              </CardDescription>
            </CardHeader>
            {loadingQuotes ? (
              <CardContent className="py-8">
                <SimpleSetupSkeleton lines={5} />
              </CardContent>
            ) : filterQuotes.length === 0 ? (
              <CardContent>
                <SimpleEmptyState
                  icon={<FileText className="h-10 w-10" />}
                  title={needle ? 'No matching quote requests' : 'No quote requests yet'}
                  description={
                    needle
                      ? 'Try a different search.'
                      : 'When visitors ask for a quote through your assistant, they show up here.'
                  }
                  action={{
                    label: 'Set up quote capture',
                    onClick: () => router.push('/dashboard/setup?step=2'),
                  }}
                />
              </CardContent>
            ) : (
              <CardContent>
                <ul className="space-y-3">
                  {filterQuotes.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-border/60 bg-card/50 p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{r.customer_name}</span>
                          <Badge variant="outline" className="text-xs">
                            Quote
                          </Badge>
                          {r.submission_source && (
                            <Badge variant="secondary" className="text-xs">
                              {r.submission_source.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{r.customer_email ?? '—'}</p>
                        {r.service_type && <p className="mt-1 text-xs text-muted-foreground">Service: {r.service_type}</p>}
                        {r.project_details && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.project_details}</p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => openInDeveloperMode(`/dashboard/quote-requests`)}>
                        Open quotes
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <SimpleDeveloperModeLink developerPath="/dashboard/leads" linkLabel="Advanced CRM in Developer Mode" />
    </div>
  );
}
