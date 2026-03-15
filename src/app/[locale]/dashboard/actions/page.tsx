import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { canUseAiActions } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { getAllActions } from '@/lib/actions/registry';

export const dynamic = 'force-dynamic';

export default async function ActionsPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');
  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const actionsEnabled = await canUseAiActions(supabase, orgId, adminAllowed);

  const actions = getAllActions();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('aiActions')}</h1>
          <p className="text-muted-foreground">{t('aiActionsDescription')}</p>
        </div>
        <Link href="/dashboard/actions/logs">
          <Button variant="outline">{t('actionLogs')}</Button>
        </Link>
      </div>

      {!actionsEnabled && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-4 text-sm text-amber-800 dark:text-amber-200">
            AI Actions are not enabled on your current plan. Upgrade to run create_lead, schedule_booking, send_email, and other actions from chat.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Available actions</CardTitle>
          <CardDescription>
            Agents can use these actions when enabled in the agent&apos;s tools. Every run is logged under Action logs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {actions.map((a) => (
              <li
                key={a.key}
                className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm"
              >
                <span className="font-medium text-foreground">{a.key}</span>
                <span className="text-muted-foreground">— {a.name}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
