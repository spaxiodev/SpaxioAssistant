import { getTranslations } from 'next-intl/server';
import { SmsInboxClient } from '@/components/dashboard/communications/sms-inbox-client';

export const dynamic = 'force-dynamic';

export default async function CommunicationsSmsPage() {
  const t = await getTranslations('dashboard');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('communicationsSmsTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('communicationsSmsDescription')}</p>
      </div>
      <SmsInboxClient />
    </div>
  );
}
