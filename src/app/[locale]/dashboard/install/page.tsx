import Link from 'next/link';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyScript } from '@/app/dashboard/install/copy-script';
import { WidgetPreviewWithPreset } from '@/app/dashboard/install/widget-preview-with-preset';
import { getTranslations } from 'next-intl/server';

export default async function InstallPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const { data: widget } = await supabase
    .from('widgets')
    .select('id')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

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
  const isActive =
    adminAllowed ||
    subscription?.status === 'active' ||
    subscription?.status === 'trialing';
  const trialEnd = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.spaxio.ai';

  const widgetId = widget?.id ?? 'YOUR_WIDGET_ID';
  const scriptTag = `<script src="${baseUrl}/widget.js" data-widget-id="${widgetId}"></script>`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('install')}</h1>
        <p className="text-muted-foreground">{t('installDescription')}</p>
      </div>

      {!isActive && trialEnd && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-800 dark:text-amber-200">
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
            Add your website URL in{' '}
            <Link href="/dashboard/settings" className="underline hover:text-foreground">
              Settings
            </Link>{' '}
            and click &quot;Learn from my website&quot; so the assistant already knows your site.
          </p>
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
            initialPreset={settings?.widget_position_preset ?? 'bottom-right'}
          />
        </CardContent>
      </Card>
    </div>
  );
}
