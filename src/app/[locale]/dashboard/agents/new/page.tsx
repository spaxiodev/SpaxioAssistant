import { getOrganizationId } from '@/lib/auth-server';
import { getTranslations } from 'next-intl/server';
import { CreateAgentForm } from '@/app/dashboard/agents/create-agent-form';

export default async function NewAgentPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const t = await getTranslations('dashboard');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('createAgent')}</h1>
        <p className="text-muted-foreground">{t('createAgentDescription')}</p>
      </div>

      <CreateAgentForm />
    </div>
  );
}
