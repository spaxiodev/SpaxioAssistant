import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent } from '@/components/ui/card';
import { getTranslations } from 'next-intl/server';

export default async function CompaniesPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, domain, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('companies')}</h1>
        <p className="text-muted-foreground">{t('leadsDescription')}</p>
      </div>

      {!companies?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t('noCompanies')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {companies.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-medium">{c.name}</p>
                  {c.domain && (
                    <p className="text-sm text-muted-foreground">{c.domain}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
