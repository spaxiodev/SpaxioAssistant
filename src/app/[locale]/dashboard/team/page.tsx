import { getOrganizationId, getUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPlanAccess } from '@/lib/plan-access';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { UpgradeRequiredCard } from '@/components/upgrade-required-card';
import { TeamMembersClient } from '@/app/dashboard/team/team-members-client';
import { BusinessSwitcher } from '@/components/dashboard/business-switcher';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function TeamMembersPage() {
  const user = await getUser();
  const orgId = await getOrganizationId(user ?? undefined);
  if (!user || !orgId) return null;

  const supabase = createAdminClient();
  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const planAccess = await getPlanAccess(supabase, orgId, adminAllowed);

  const t = await getTranslations('dashboard');

  if (!planAccess.featureAccess.team_members) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4">
          <BusinessSwitcher />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('teamMembers')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('teamMembersDescription')}</p>
          </div>
        </div>
        <UpgradeRequiredCard
          featureKey="team_members"
          currentPlanName={planAccess.planName}
          from="team_members"
          title={t('upgradeToInviteTeamMembers')}
          description={t('upgradeToInviteTeamMembersDescription')}
        />
        <TeamMembersClient />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4">
        <BusinessSwitcher />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('teamMembers')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('teamMembersDescription')}</p>
        </div>
      </div>
      <TeamMembersClient />
    </div>
  );
}
