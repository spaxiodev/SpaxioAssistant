import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { BusinessSettingsForm } from '@/app/dashboard/settings/business-settings-form';
import { getTranslations } from 'next-intl/server';

export default async function SettingsPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const { data: settings } = await supabase
    .from('business_settings')
    .select(
      'business_name, industry, company_description, services_offered, pricing_notes, service_base_prices, tone_of_voice, contact_email, phone, lead_notification_email, primary_brand_color, chatbot_name, chatbot_welcome_message, widget_logo_url, widget_enabled, website_url, website_learned_at, widget_action_mappings'
    )
    .eq('organization_id', orgId)
    .single();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('settingsTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('settingsDescription')}</p>
      </div>
      <BusinessSettingsForm initial={settings ?? undefined} />
    </div>
  );
}
