import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTranslations } from 'next-intl/server';
import { canUseVoice } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { Link } from '@/i18n/navigation';
import { VoiceSessionsClient } from '@/app/dashboard/voice/voice-sessions-client';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function VoicePage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');
  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const voiceEnabled = await canUseVoice(supabase, orgId, adminAllowed);

  if (!voiceEnabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('voice')}</h1>
          <p className="text-muted-foreground">{t('voiceNotEnabled')}</p>
        </div>
      </div>
    );
  }

  const { data: sessions } = await supabase
    .from('voice_sessions')
    .select('id, conversation_id, agent_id, source_type, status, started_at, ended_at, duration_seconds, transcript_summary, created_at')
    .eq('organization_id', orgId)
    .order('started_at', { ascending: false })
    .limit(50);

  const agentIds = [...new Set((sessions ?? []).map((s) => (s as { agent_id: string | null }).agent_id).filter(Boolean))] as string[];
  const { data: agents } = agentIds.length > 0 ? await supabase.from('agents').select('id, name').in('id', agentIds) : { data: [] };
  const agentById = new Map((agents ?? []).map((a) => [a.id, a.name]));

  const list = (sessions ?? []).map((s) => ({
    id: (s as { id: string }).id,
    conversationId: (s as { conversation_id: string | null }).conversation_id,
    agentId: (s as { agent_id: string | null }).agent_id,
    agentName: (s as { agent_id: string | null }).agent_id ? agentById.get((s as { agent_id: string }).agent_id) ?? null : null,
    sourceType: (s as { source_type: string }).source_type,
    status: (s as { status: string }).status,
    startedAt: (s as { started_at: string }).started_at,
    endedAt: (s as { ended_at: string | null }).ended_at,
    durationSeconds: (s as { duration_seconds: number | null }).duration_seconds,
    transcriptSummary: (s as { transcript_summary: string | null }).transcript_summary,
    createdAt: (s as { created_at: string }).created_at,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('voice')}</h1>
          <p className="text-muted-foreground">{t('voiceDescription')}</p>
        </div>
        <Link
          href="/dashboard/voice/settings"
          className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          {t('voiceSettings')}
        </Link>
      </div>

      <VoiceSessionsClient sessions={list} />
    </div>
  );
}
