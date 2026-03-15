import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plug } from 'lucide-react';
import { getPlanAccess } from '@/lib/plan-access';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { UpgradeRequiredCard } from '@/components/upgrade-required-card';

export default async function IntegrationsPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');
  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const planAccess = await getPlanAccess(supabase, orgId, adminAllowed);
  if (!planAccess.featureAccess.integrations) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('integrations')}</h1>
          <p className="text-muted-foreground">{t('integrationsDescription')}</p>
        </div>
        <UpgradeRequiredCard
          featureKey="integrations"
          currentPlanName={planAccess.planName}
          from="integrations"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('integrations')}</h1>
        <p className="text-muted-foreground">{t('integrationsDescription')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('integrations')}</CardTitle>
          <CardDescription>
            Connect APIs and external tools to your workflows. Webhooks, API keys, and CRM connectors are configured per workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 p-8 text-center">
            <Plug className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Integrations</p>
            <p className="mt-1 text-xs text-muted-foreground">Webhooks and API keys are available in Automations and Settings.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
