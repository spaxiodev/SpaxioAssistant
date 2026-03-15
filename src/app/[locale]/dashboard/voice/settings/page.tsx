import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTranslations } from 'next-intl/server';
import { canUseVoice } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { Link } from '@/components/intl-link';
import { VoiceSettingsClient } from '@/app/dashboard/voice/voice-settings-client';

export const dynamic = 'force-dynamic';

export default async function VoiceSettingsPage() {
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
          <h1 className="text-2xl font-bold tracking-tight">{t('voiceSettings')}</h1>
          <p className="text-muted-foreground">{t('voiceNotEnabled')}</p>
        </div>
      </div>
    );
  }

  const { data: agents } = await supabase
    .from('agents')
    .select('id, name')
    .eq('organization_id', orgId)
    .order('name');

  const { data: voiceSettingsList } = await supabase
    .from('voice_agent_settings')
    .select('*')
    .eq('organization_id', orgId);

  const settingsByAgent = new Map(
    (voiceSettingsList ?? []).map((s) => [(s as { agent_id: string }).agent_id, s])
  );

  const agentsWithSettings = (agents ?? []).map((a) => ({
    id: a.id,
    name: a.name ?? 'Unnamed agent',
    settings: settingsByAgent.get(a.id) ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/voice" className="text-muted-foreground hover:text-foreground">
          ← {t('voice')}
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('voiceSettings')}</h1>
        <p className="text-muted-foreground">{t('voiceSettingsDescription')}</p>
      </div>

      <VoiceSettingsClient agentsWithSettings={agentsWithSettings} />
    </div>
  );
}
