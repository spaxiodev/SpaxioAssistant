import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent } from '@/components/ui/card';
import { getTranslations } from 'next-intl/server';

export default async function ContactsPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, name, email, phone, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('contacts')}</h1>
        <p className="text-muted-foreground">{t('leadsDescription')}</p>
      </div>

      {!contacts?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t('noContacts')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {contacts.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-muted-foreground">{c.email ?? c.phone ?? '—'}</p>
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
