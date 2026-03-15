import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/components/intl-link';
import { WebhookEndpointClient } from '@/app/dashboard/webhooks/webhook-endpoint-client';

type Props = { params: Promise<{ id: string }> };

export default async function WebhookEndpointPage({ params }: Props) {
  const { id } = await params;
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const { data: endpoint } = await supabase
    .from('webhook_endpoints')
    .select('id, name, slug, active, last_success_at, last_failure_at, last_failure_message, created_at')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single();

  if (!endpoint) notFound();

  const { data: mappings } = await supabase
    .from('webhook_field_mappings')
    .select('id, source_path, target_key, value_type, required, default_value')
    .eq('endpoint_id', id)
    .order('target_key');

  const t = await getTranslations('dashboard');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/webhooks" className="text-sm text-muted-foreground hover:text-foreground">
          ← {t('webhooks')}
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{endpoint.name}</h1>
        <p className="text-muted-foreground">Slug: {endpoint.slug}</p>
      </div>

      <WebhookEndpointClient
        endpoint={endpoint}
        initialMappings={mappings ?? []}
        baseUrl={baseUrl}
      />
    </div>
  );
}
