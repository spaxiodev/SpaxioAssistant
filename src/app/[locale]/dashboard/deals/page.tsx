import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent } from '@/components/ui/card';
import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';

export default async function DealsPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const { data: deals } = await supabase
    .from('deals')
    .select('id, title, value_cents, stage, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('deals')}</h1>
        <p className="text-muted-foreground">{t('leadsDescription')}</p>
      </div>

      {!deals?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t('noDeals')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {deals.map((d) => (
            <Card key={d.id} className="overflow-hidden">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-3">
                  <p className="font-medium">{d.title}</p>
                  <Badge variant="secondary" className="text-xs">
                    {d.stage}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">
                    ${(d.value_cents / 100).toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(d.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
