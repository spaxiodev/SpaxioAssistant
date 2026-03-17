import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import type { Lead } from '@/lib/supabase/database.types';
import { LeadRowActions } from '../../../dashboard/leads/lead-row-actions';
import { LeadDetailSheet } from '../../../dashboard/leads/lead-detail-sheet';
import { FollowUpCard } from '@/components/dashboard/follow-up-card';
import { MemoryCard } from '@/components/dashboard/memory-card';
import { getTranslations } from 'next-intl/server';

function priorityLabel(priority: string | null): string {
  if (!priority) return '';
  switch (priority) {
    case 'high':
      return 'Hot lead';
    case 'medium':
      return 'Likely customer soon';
    case 'low':
      return 'Needs follow-up';
    default:
      return priority;
  }
}

function LeadCard({
  lead,
  labels,
}: {
  lead: Lead;
  labels: { emailLabel: string; phone: string; requestedService: string; timeline: string; projectDetails: string; location: string; message: string; chatSnippet: string };
}) {
  const fields: { label: string; value: string | null }[] = [
    { label: labels.emailLabel, value: lead.email },
    { label: labels.phone, value: lead.phone },
    { label: labels.requestedService, value: lead.requested_service },
    { label: labels.timeline, value: lead.requested_timeline },
    { label: labels.projectDetails, value: lead.project_details },
    { label: labels.location, value: lead.location },
    { label: labels.message, value: lead.message },
  ];
  const score = lead.qualification_score ?? null;
  const priority = lead.qualification_priority ?? null;
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">{lead.name}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {score != null && (
              <span
                className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
                title="AI lead score 0-100"
              >
                Score {score}
              </span>
            )}
            {priority && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  priority === 'high'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                    : priority === 'medium'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                      : 'bg-muted text-muted-foreground'
                }`}
                title="AI priority"
              >
                {priorityLabel(priority)}
              </span>
            )}
            <span className="text-sm text-muted-foreground">{formatDate(lead.created_at)}</span>
            <LeadDetailSheet lead={lead} asTrigger />
            <LeadRowActions leadId={lead.id} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {(lead.qualification_summary || lead.next_recommended_action) && (
          <div className="mb-4 rounded-md border border-primary/20 bg-primary/5 p-3">
            <dt className="text-xs font-medium text-muted-foreground">AI Summary</dt>
            {lead.qualification_summary && (
              <dd className="mt-1 text-sm">{lead.qualification_summary}</dd>
            )}
            {lead.next_recommended_action && (
              <dd className="mt-1 text-xs text-muted-foreground">
                Next: {lead.next_recommended_action}
              </dd>
            )}
          </div>
        )}
        <FollowUpCard leadId={lead.id} />
        <MemoryCard subjectType="lead" subjectId={lead.id} />
        <dl className="grid gap-3 sm:grid-cols-2">
          {fields.map(
            (f) =>
              f.value && (
                <div key={f.label}>
                  <dt className="text-xs font-medium text-muted-foreground">{f.label}</dt>
                  <dd className="mt-0.5 text-sm whitespace-pre-wrap break-words">{f.value}</dd>
                </div>
              )
          )}
        </dl>
        {lead.transcript_snippet && (
          <div className="mt-4 rounded-md border bg-muted/20 p-3">
            <dt className="text-xs font-medium text-muted-foreground">{labels.chatSnippet}</dt>
            <dd className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap break-words line-clamp-4">
              {lead.transcript_snippet}
            </dd>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function LeadsPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100);

  const labels = {
    emailLabel: t('emailLabel'),
    phone: t('phone'),
    requestedService: t('requestedService'),
    timeline: t('timeline'),
    projectDetails: t('projectDetails'),
    location: t('location'),
    message: t('message'),
    chatSnippet: t('chatSnippet'),
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('leadsTitle')}</h1>
        <p className="text-muted-foreground">{t('leadsDescription')}</p>
      </div>

      {!leads?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t('noLeads')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} labels={labels} />
          ))}
        </div>
      )}
    </div>
  );
}
