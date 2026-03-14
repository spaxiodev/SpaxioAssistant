import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTranslations } from 'next-intl/server';
import { WebhooksClient } from '@/app/dashboard/webhooks/webhooks-client';

export default async function WebhooksPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const { data: endpoints } = await supabase
    .from('webhook_endpoints')
    .select('id, name, slug, active, last_success_at, last_failure_at, last_failure_message, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('webhooks')}</h1>
        <p className="text-muted-foreground">{t('webhooksDescription')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('webhooks')}</CardTitle>
          <CardDescription>
            Create workspace-level webhook endpoints. Use the URL in external systems to send data into Spaxio. Optionally map payload fields to internal variables for automations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WebhooksClient
            initialEndpoints={endpoints ?? []}
            baseUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''}
          />
        </CardContent>
      </Card>
    </div>
  );
}
