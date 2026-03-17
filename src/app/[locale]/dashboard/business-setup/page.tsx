import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { BusinessSetupPageClient } from '@/app/dashboard/business-setup/business-setup-page-client';

export default async function BusinessSetupPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const { data: draftList } = await supabase
    .from('business_setup_drafts')
    .select('id, status, created_at, updated_at')
    .eq('organization_id', orgId)
    .order('updated_at', { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8">
      <BusinessSetupPageClient initialDrafts={draftList ?? []} />
    </div>
  );
}
