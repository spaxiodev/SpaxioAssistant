import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function AssistantPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const { data: settings } = await supabase
    .from('business_settings')
    .select('business_name, chatbot_welcome_message, tone_of_voice, company_description')
    .eq('organization_id', orgId)
    .single();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('assistant')}</h1>
        <p className="text-muted-foreground">{t('assistantDescription')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('behavior')}</CardTitle>
          <CardDescription>{t('behaviorDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('business')}</p>
            <p className="font-medium">{settings?.business_name || t('notSet')}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('welcomeMessage')}</p>
            <p className="text-sm">{settings?.chatbot_welcome_message || 'Hi! How can I help you today?'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t('tone')}</p>
            <p className="text-sm">{settings?.tone_of_voice || 'professional'}</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/settings">{t('editInSettings')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
