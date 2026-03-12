import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { QuoteRequest } from '@/lib/supabase/database.types';
import { QuoteRequestRowActions } from '../../../dashboard/quote-requests/quote-request-row-actions';
import { getTranslations } from 'next-intl/server';

function formatBudget(r: QuoteRequest): string {
  if (r.budget_text) return r.budget_text;
  if (r.budget_amount != null) return `$${Number(r.budget_amount).toLocaleString()}`;
  return '—';
}

function getWorthItStatus(
  r: QuoteRequest,
  basePrices: Record<string, number> | null
): 'worth_it' | 'not_worth_it' | null {
  if (r.budget_amount == null || !Number.isFinite(r.budget_amount)) return null;
  const base = basePrices && r.service_type ? basePrices[r.service_type] : undefined;
  if (base == null || !Number.isFinite(base)) return null;
  return r.budget_amount >= base ? 'worth_it' : 'not_worth_it';
}

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('quoteRequestsTitle')}</h1>
        <p className="text-muted-foreground">{t('quoteRequestsDescription')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('allQuoteRequests')}</CardTitle>
          <CardDescription>{t('quoteRequestsCardDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {!requests?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('noQuoteRequests')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('customer')}</TableHead>
                  <TableHead>{t('service')}</TableHead>
                  <TableHead>{t('budget')}</TableHead>
                  <TableHead>{t('worthIt')}</TableHead>
                  <TableHead>{t('location')}</TableHead>
                  <TableHead>{t('details')}</TableHead>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => {
                  const worthIt = getWorthItStatus(r, basePrices);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.customer_name}</TableCell>
                      <TableCell>{r.service_type ?? '—'}</TableCell>
                      <TableCell>{formatBudget(r)}</TableCell>
                      <TableCell>
                        {worthIt === 'worth_it' && (
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                            {t('worthItYes')}
                          </Badge>
                        )}
                        {worthIt === 'not_worth_it' && (
                          <Badge variant="destructive">{t('worthItNo')}</Badge>
                        )}
                        {worthIt === null && <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>{r.location ?? '—'}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {r.project_details ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                      <TableCell>
                        <QuoteRequestRowActions quoteRequestId={r.id} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
