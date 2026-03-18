import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { routing } from '@/i18n/routing';
import { getOrganizationId, getUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { hasActiveSubscription } from '@/lib/entitlements';
import { getPlanAccess } from '@/lib/plan-access';
import { DashboardLayoutClient } from '@/components/dashboard/dashboard-layout-client';
import { GuestDashboardShell } from '@/components/dashboard/guest-dashboard-shell';
import { HomeContent } from '@/components/home-content';
import { HelpChatGate } from '@/components/help-chat-gate';
import { LazyToaster } from '@/components/lazy-toaster';
import { OnboardingGate } from '@/components/dashboard/onboarding-gate';
import type { UserDisplay } from '@/types/dashboard';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Dashboard',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    return (
      <GuestDashboardShell>
        <HomeContent />
      </GuestDashboardShell>
    );
  }

  const orgId = await getOrganizationId(user);

  if (!orgId) {
    const headersList = await headers();
    const locale = headersList.get('x-next-intl-locale') ?? routing.defaultLocale;
    redirect(`/${locale}/login`);
  }

  const supabase = createAdminClient();
  const [adminAllowed, active, profile, businessSettings] = await Promise.all([
    isOrgAllowedByAdmin(supabase, orgId),
    hasActiveSubscription(supabase, orgId, false),
    supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle(),
    supabase.from('business_settings').select('business_name').eq('organization_id', orgId).single(),
  ]);
  const hasActive = adminAllowed || active;
  const needsOnboarding = !(businessSettings?.data?.business_name?.trim());
  const planAccess = await getPlanAccess(supabase, orgId, adminAllowed);

  const userDisplay: UserDisplay = {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.data?.full_name ?? (user.user_metadata as { full_name?: string } | undefined)?.full_name ?? null,
    avatarUrl: profile?.data?.avatar_url ?? null,
  };

  // Show upgrade button when no active subscription, or when user is admin (so they can see pricing/upgrade flow)
  const showUpgradeButton = !hasActive || adminAllowed;

  return (
    <>
      <DashboardLayoutClient
        organizationId={orgId}
        userDisplay={userDisplay}
        planAccess={planAccess}
        showUpgradeButton={showUpgradeButton}
      >
        {children}
      </DashboardLayoutClient>
      <HelpChatGate />
      <OnboardingGate needsOnboarding={needsOnboarding} />
      <LazyToaster />
    </>
  );
}
