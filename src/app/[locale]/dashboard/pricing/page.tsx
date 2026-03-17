import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { PricingProfilesList } from '@/app/dashboard/pricing/pricing-profiles-list';

export default async function PricingPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const { data: profiles } = await supabase
    .from('quote_pricing_profiles')
    .select('id, name, industry_type, is_default, currency, pricing_mode')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('pricingRules')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('pricingRulesDescription')}</p>
      </div>
      <PricingProfilesList profiles={profiles ?? []} />
    </div>
  );
}
