import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent } from '@/components/ui/card';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { canUseAiActions } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { ActionLogsClient } from '@/app/dashboard/actions/action-logs-client';

export const dynamic = 'force-dynamic';

export default async function ActionLogsPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');
  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const actionsEnabled = await canUseAiActions(supabase, orgId, adminAllowed);

  const { data: invocations } = actionsEnabled
    ? await supabase
        .from('action_invocations')
        .select('id, action_key, status, initiated_by_type, started_at, completed_at, error_text, input_json, output_json')
        .eq('organization_id', orgId)
        .order('started_at', { ascending: false })
        .limit(50)
    : { data: [] };

  const { data: agents } = await supabase.from('agents').select('id, name').eq('organization_id', orgId).order('name');

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/actions" className="text-muted-foreground hover:text-foreground">
          ← {t('aiActions')}
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('actionLogs')}</h1>
        <p className="text-muted-foreground">{t('actionLogsDescription')}</p>
      </div>

      {!actionsEnabled && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-4 text-sm text-amber-800 dark:text-amber-200">
            AI Actions are not enabled on your current plan. Action logs are available when AI Actions are enabled.
          </CardContent>
        </Card>
      )}

      <ActionLogsClient
        initialInvocations={(invocations ?? []) as { id: string; action_key: string; status: string; initiated_by_type: string; started_at: string; completed_at: string | null; error_text: string | null; input_json?: unknown; output_json?: unknown }[]}
        agents={(agents ?? []) as { id: string; name: string }[]}
      />
    </div>
  );
}
