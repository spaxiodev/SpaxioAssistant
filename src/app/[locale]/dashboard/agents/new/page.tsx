import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTranslations } from 'next-intl/server';
import { CreateAgentForm } from '@/app/dashboard/agents/create-agent-form';
import { canCreateAgent, getPlanForOrg } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { UpgradeRequiredCard } from '@/components/upgrade-required-card';
import { buildUpgradeUrl, getNextPlanSlug, normalizePlanSlug, PLAN_DISPLAY_NAMES } from '@/lib/plan-config';

export default async function NewAgentPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');
  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const allowed = await canCreateAgent(supabase, orgId, adminAllowed);

  if (!allowed) {
    const plan = await getPlanForOrg(supabase, orgId);
    const planSlug = normalizePlanSlug(plan?.slug ?? 'free') ?? 'free';
    const planName = plan?.name ?? PLAN_DISPLAY_NAMES[planSlug];
    const nextSlug = getNextPlanSlug(planSlug);
    const nextName = PLAN_DISPLAY_NAMES[nextSlug];
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('createAgent')}</h1>
          <p className="text-muted-foreground">{t('createAgentDescription')}</p>
        </div>
        <UpgradeRequiredCard
          featureKey="automations"
          currentPlanName={planName}
          title={t('upgradeRequired')}
          description={t('upgradeToCreateMore')}
          upgradeHref={buildUpgradeUrl({ from: 'agents', current: planSlug, recommended: nextSlug })}
          recommendedPlanName={nextName}
          skipFeatureLine
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('createAgent')}</h1>
        <p className="text-muted-foreground">{t('createAgentDescription')}</p>
      </div>

      <CreateAgentForm />
    </div>
  );
}
