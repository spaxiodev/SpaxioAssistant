import { getTranslations } from 'next-intl/server';
import { AISetupClient } from '@/app/dashboard/ai-setup/ai-setup-client';

export default async function AISetupPage() {
  return (
    <div className="space-y-6">
      <AISetupClient />
    </div>
  );
}

export async function generateMetadata() {
  const t = await getTranslations('dashboard');
  return {
    title: t('aiSetupAssistant'),
    description: t('aiSetupDescription'),
  };
}
