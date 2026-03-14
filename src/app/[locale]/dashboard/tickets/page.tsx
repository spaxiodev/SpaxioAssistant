import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent } from '@/components/ui/card';
import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';

export default async function TicketsPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('id, title, status, priority, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('tickets')}</h1>
        <p className="text-muted-foreground">{t('leadsDescription')}</p>
      </div>

      {!tickets?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t('noTickets')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tickets.map((tk) => (
            <Card key={tk.id} className="overflow-hidden">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-3">
                  <p className="font-medium">{tk.title}</p>
                  <Badge variant="secondary" className="text-xs">
                    {tk.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {tk.priority}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(tk.created_at).toLocaleDateString()}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
