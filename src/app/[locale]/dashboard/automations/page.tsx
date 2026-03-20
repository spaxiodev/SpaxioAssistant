import { headers } from 'next/headers';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPublicAppUrl } from '@/lib/app-url';
import type { Automation } from '@/lib/supabase/database.types';
import { AutomationsDashboardClient } from '@/app/dashboard/automations/automations-dashboard-client';
import type { RunWithName } from '@/app/dashboard/automations/recent-runs';
import { ensureWebhookTokenForAutomations } from '@/lib/automations/webhook-url';
import { getPlanAccess } from '@/lib/plan-access';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { getOrganizationAccessSnapshot, canCreateResourceFromSnapshot } from '@/lib/billing/access';
import { UpgradeRequiredCard } from '@/components/upgrade-required-card';
import { UsageLimitBanner } from '@/components/dashboard/usage-limit-banner';

export const dynamic = 'force-dynamic';

export default async function AutomationsPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const [planAccess, snapshot] = await Promise.all([
    getPlanAccess(supabase, orgId, adminAllowed),
    getOrganizationAccessSnapshot(supabase, orgId, adminAllowed),
  ]);
  const automationCreateStatus = canCreateResourceFromSnapshot(snapshot, 'automations');

  if (!planAccess.featureAccess.automations) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Automations</h1>
          <p className="text-muted-foreground">Simple follow-up rules that save you time (notifications, reminders, and routing).</p>
        </div>
        <UpgradeRequiredCard
          featureKey="automations"
          currentPlanName={planAccess.planName}
          from="automations"
        />
      </div>
    );
  }

  const [automationsRes, agentsRes, automationIdsRes] = await Promise.all([
    supabase
      .from('automations')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
    supabase.from('agents').select('id, name').eq('organization_id', orgId).order('name'),
    supabase.from('automations').select('id').eq('organization_id', orgId),
  ]);

  let automations: (Automation & { webhook_url?: string })[] = (automationsRes.data ?? []) as Automation[];
  automations = await ensureWebhookTokenForAutomations(supabase, automations);
  const headersList = await headers();
  const baseUrl = getPublicAppUrl({ headers: headersList }).replace(/\/$/, '');
  automations = automations.map((a) => {
    if (a.trigger_type === 'webhook_received' && a.webhook_token) {
      return { ...a, webhook_url: `${baseUrl}/api/webhooks/${a.webhook_token}` };
    }
    return a;
  });
  const agents = (agentsRes.data ?? []).map((a) => ({ id: a.id, name: a.name }));
  const orgAutomationIds = (automationIdsRes.data ?? []).map((a) => a.id);

  let runs: RunWithName[] = [];
  if (orgAutomationIds.length > 0) {
    const runsRes = await supabase
      .from('automation_runs')
      .select('id, automation_id, status, error_message, started_at, completed_at, trigger_event_type, duration_ms, summary, trace_id')
      .in('automation_id', orgAutomationIds)
      .order('started_at', { ascending: false })
      .limit(20);
    const runsList = runsRes.data ?? [];
    const namesRes = await supabase
      .from('automations')
      .select('id, name')
      .in('id', [...new Set(runsList.map((r) => r.automation_id))]);
    const nameById = new Map((namesRes.data ?? []).map((a) => [a.id, a.name]));
    runs = runsList.map((r) => ({
      ...r,
      automation_name: nameById.get(r.automation_id) ?? null,
    }));
  }

  const automationLimitBanner =
    (automationCreateStatus === 'limit_reached' || automationCreateStatus === 'requires_upgrade') ? (
      <UsageLimitBanner
        resourceLabel="automations"
        used={snapshot.richUsage.automations_count}
        limit={snapshot.richUsage.automations_limit}
        status={automationCreateStatus}
        message={
          automationCreateStatus === 'limit_reached'
            ? "You've reached the automation limit for your plan. Existing automations continue running. Upgrade to create more."
            : undefined
        }
      />
    ) : null;

  return (
    <AutomationsDashboardClient
      automations={automations}
      agents={agents}
      runs={runs}
      canCreateAutomation={automationCreateStatus === 'allowed' || automationCreateStatus === 'warning'}
      limitBanner={automationLimitBanner}
    />
  );
}
