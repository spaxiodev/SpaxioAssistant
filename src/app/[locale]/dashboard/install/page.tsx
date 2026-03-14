import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { hasActiveSubscription } from '@/lib/entitlements';
import { getPublicAppUrl } from '@/lib/app-url';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyScript } from '@/app/dashboard/install/copy-script';
import { WidgetPreviewWithPreset } from '@/app/dashboard/install/widget-preview-with-preset';
import { WidgetAgentLink } from '@/app/dashboard/install/widget-agent-link';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

export default async function InstallPage({ params }: Props) {
  const { locale } = await params;
  const widgetLocale = (routing.locales.includes(locale as 'en' | 'fr') ? locale : routing.defaultLocale) as 'en' | 'fr';

  const orgId = await getOrganizationId();
  if (!orgId) {
    redirect(`/${locale}/login?redirectTo=/${locale}/dashboard/install`);
  }

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const { data: widget } = await supabase
    .from('widgets')
    .select('id, agent_id, agents(name)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: agents } = await supabase
    .from('agents')
    .select('id, name')
    .eq('organization_id', orgId)
    .order('name');

  const { data: settings } = await supabase
    .from('business_settings')
    .select('widget_position_preset')
    .eq('organization_id', orgId)
    .single();

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, trial_ends_at')
    .eq('organization_id', orgId)
    .single();

  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const isActive = await hasActiveSubscription(supabase, orgId, adminAllowed);
  const trialEnd = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const headersList = await headers();
  const baseUrl = getPublicAppUrl({ headers: headersList });

  const widgetId = widget?.id ?? 'YOUR_WIDGET_ID';
  const scriptTag = `<script src="${baseUrl}/widget.js" data-widget-id="${widgetId}"></script>`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('install')}</h1>
        <p className="text-muted-foreground">{t('installDescription')}</p>
      </div>

      {!isActive && trialEnd && (
        <Card className="border-border bg-muted/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {t('installTrialNote', { date: trialEnd.toLocaleDateString() })}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('installCodeTitle')}</CardTitle>
          <CardDescription>
            {t('installCodeDescription', { bodyTag: '</body>' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <pre className="overflow-x-auto rounded-xl bg-muted/50 p-4 text-sm shadow-[inset_0_1px_2px_hsl(var(--foreground)/0.04)]">
            <code>{scriptTag}</code>
          </pre>
          <CopyScript
            text={scriptTag}
            copiedTitle={t('copied')}
            copiedDescription={t('installCodeCopied')}
            copyCodeLabel={t('copyCode')}
            copiedButtonLabel={t('copied')}
          />
          <p className="text-xs text-muted-foreground">
            {t('optionalCustomUrl')}
          </p>
          <p className="text-xs text-muted-foreground">
            Add URLs and documents in{' '}
            <Link href="/dashboard/knowledge" className="underline hover:text-foreground">
              Knowledge
            </Link>{' '}
            so the assistant can use your site content when answering.
          </p>
          {agents && agents.length > 0 && widget?.id && (
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-sm">
              <WidgetAgentLink
                widgetId={widget.id}
                currentAgentId={widget.agent_id}
                agents={agents}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                <Link href="/dashboard/agents" className="text-primary underline">
                  {t('installEditAgents')}
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('preview')}</CardTitle>
          <CardDescription>
            {t('previewDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WidgetPreviewWithPreset
            widgetId={widget?.id ?? ''}
            baseUrl={baseUrl}
            locale={widgetLocale}
            initialPreset={settings?.widget_position_preset ?? 'bottom-right'}
          />
        </CardContent>
      </Card>
    </div>
  );
}
