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
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';

type Props = { params: Promise<{ locale: string }> };

export default async function InstallPage({ params }: Props) {
  const { locale } = await params;
  const widgetLocale = (routing.locales.includes(locale as 'en' | 'fr-CA') ? locale : routing.defaultLocale) as 'en' | 'fr-CA';

  const orgId = await getOrganizationId();
  if (!orgId) {
    redirect(`/${locale}/login?redirectTo=/${locale}/dashboard/install`);
  }

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const { data: widgets } = await supabase
    .from('widgets')
    .select('id, agent_id')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true });

  const { data: agents } = await supabase
    .from('agents')
    .select('id, name')
    .eq('organization_id', orgId)
    .order('name');

  const widgetByAgentId = new Map<string, string>();
  (widgets ?? []).forEach((w) => {
    if (w.agent_id) widgetByAgentId.set(w.agent_id, w.id);
  });
  const firstWidgetId = (widgets ?? [])[0]?.id ?? null;

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
            {t('installCodeDescription', { bodyTag: '</body>' })}. Each agent has its own embed code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {agents && agents.length > 0 ? (
            agents.map((agent) => {
              const wId = widgetByAgentId.get(agent.id);
              const scriptTag = wId
                ? `<script src="${baseUrl}/widget.js" data-widget-id="${wId}"></script>`
                : `<script src="${baseUrl}/widget.js" data-agent-id="${agent.id}"></script>`;
              return (
                <div key={agent.id} className="rounded-lg border border-border/50 bg-muted/30 p-4">
                  <p className="mb-2 font-medium text-foreground">{agent.name}</p>
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
                </div>
              );
            })
          ) : (
            <>
              <pre className="overflow-x-auto rounded-xl bg-muted/50 p-4 text-sm shadow-[inset_0_1px_2px_hsl(var(--foreground)/0.04)]">
                <code>{`<script src="${baseUrl}/widget.js" data-widget-id="YOUR_WIDGET_ID"></script>`}</code>
              </pre>
              <CopyScript
                text={`<script src="${baseUrl}/widget.js" data-widget-id="YOUR_WIDGET_ID"></script>`}
                copiedTitle={t('copied')}
                copiedDescription={t('installCodeCopied')}
                copyCodeLabel={t('copyCode')}
                copiedButtonLabel={t('copied')}
              />
              <p className="text-sm text-muted-foreground">
                Create an agent in <Link href="/dashboard/agents" className="text-primary underline">Agents</Link> to get a dedicated widget script.
              </p>
            </>
          )}
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
          {agents && agents.length > 0 && (
            <p className="text-xs text-muted-foreground">
              <Link href="/dashboard/agents" className="text-primary underline">
                {t('installEditAgents')}
              </Link>
            </p>
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
            widgetId={firstWidgetId ?? ''}
            baseUrl={baseUrl}
            locale={widgetLocale}
            initialPreset={settings?.widget_position_preset ?? 'bottom-right'}
          />
        </CardContent>
      </Card>
    </div>
  );
}
