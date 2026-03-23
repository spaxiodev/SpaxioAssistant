import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { getPlanAccess } from '@/lib/plan-access';
import { AiSearchDashboard } from '@/components/dashboard/ai-search/ai-search-dashboard';

export default async function AiSearchPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const planAccess = await getPlanAccess(supabase, orgId, adminAllowed);

  return <AiSearchDashboard featureAccess={planAccess.featureAccess} />;
}
