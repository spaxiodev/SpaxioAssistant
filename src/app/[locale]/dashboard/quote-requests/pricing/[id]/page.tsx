import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPricingContext } from '@/lib/quote-pricing/estimate-quote-service';
import { notFound } from 'next/navigation';
import { PricingProfileDetail } from '@/app/dashboard/pricing/pricing-profile-detail';

export default async function QuoteRequestsPricingProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const { id } = await params;
  const supabase = createAdminClient();
  const context = await getPricingContext(supabase, { organizationId: orgId, pricingProfileId: id });
  if (!context) notFound();

  return (
    <PricingProfileDetail
      profile={context.profile}
      services={context.services}
      variables={context.variables}
      rules={context.rules}
      basePath="/dashboard/quote-requests/pricing"
    />
  );
}
