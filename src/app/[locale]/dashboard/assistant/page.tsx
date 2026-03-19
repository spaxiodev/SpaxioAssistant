import { getOrganizationId } from '@/lib/auth-server';
import { getTranslations } from 'next-intl/server';
import { AssistantSettingsForm } from '@/components/dashboard/assistant-settings-form';

export default async function AssistantPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const t = await getTranslations('dashboard');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('assistant')}</h1>
        <p className="text-muted-foreground">{t('assistantDescription')}</p>
      </div>

      <AssistantSettingsForm />
    </div>
  );
}
