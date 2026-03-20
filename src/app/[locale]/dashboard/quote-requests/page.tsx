import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTranslations } from 'next-intl/server';
import { QuoteRequestsTableClient } from '../../../dashboard/quote-requests/quote-requests-table-client';

export default async function QuoteRequestsPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const [
    { data: requests },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from('quote_requests')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('business_settings')
      .select('service_base_prices')
      .eq('organization_id', orgId)
      .single(),
  ]);

  const basePrices =
    settings?.service_base_prices && typeof settings.service_base_prices === 'object'
      ? (settings.service_base_prices as Record<string, number>)
      : null;

  const labels = {
    customer: t('customer'),
    email: t('emailLabel'),
    phone: t('phone'),
    service: t('service'),
    budget: t('budget'),
    worthIt: t('worthIt'),
    location: t('location'),
    details: t('details'),
    date: t('date'),
    worthItYes: t('worthItYes'),
    worthItNo: t('worthItNo'),
    allQuoteRequests: t('allQuoteRequests'),
    quoteRequestsCardDescription: t('quoteRequestsCardDescription'),
    noQuoteRequests: t('noQuoteRequests'),
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('quoteRequestsTitle')}</h1>
        <p className="text-muted-foreground">{t('quoteRequestsDescription')}</p>
      </div>

      <QuoteRequestsTableClient
        requests={requests ?? []}
        basePrices={basePrices}
        labels={labels}
      />
    </div>
  );
}
