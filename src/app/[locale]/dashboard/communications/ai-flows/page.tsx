import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function CommunicationsAiFlowsPage() {
  const t = await getTranslations('dashboard');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('communicationsAiFlowsTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('communicationsAiFlowsDescription')}</p>
      </div>
      <Card className="border-border/80 border-dashed shadow-sm">
        <CardHeader>
          <CardTitle>{t('communicationsAiFlowsPlaceholderTitle')}</CardTitle>
          <CardDescription>{t('communicationsAiFlowsPlaceholderBody')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>{t('communicationsAiFlowsBulletGreeting')}</li>
            <li>{t('communicationsAiFlowsBulletHours')}</li>
            <li>{t('communicationsAiFlowsBulletQuote')}</li>
            <li>{t('communicationsAiFlowsBulletEscalation')}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
