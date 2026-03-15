import { getOrganizationId, getUser } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTranslations } from 'next-intl/server';
import { ProfileForm } from '@/app/dashboard/account/profile-form';
import { BusinessSettingsForm } from '@/app/dashboard/settings/business-settings-form';
import { Link } from '@/components/intl-link';
import { Settings } from 'lucide-react';

export default async function AccountPage() {
  const user = await getUser();
  const orgId = await getOrganizationId(user ?? undefined);
  if (!user || !orgId) return null;

  const supabase = createAdminClient();
  const [profile, settings] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle(),
    supabase
      .from('business_settings')
      .select(
        'business_name, industry, company_description, services_offered, pricing_notes, service_base_prices, tone_of_voice, contact_email, phone, lead_notification_email, primary_brand_color, chatbot_name, chatbot_welcome_message, widget_logo_url, widget_enabled, website_url, website_learned_at'
      )
      .eq('organization_id', orgId)
      .single(),
  ]);

  const t = await getTranslations('dashboard');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('account')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('accountDescription')}</p>
      </div>

      <ProfileForm
        initial={{
          fullName: profile?.data?.full_name ?? (user.user_metadata as { full_name?: string } | undefined)?.full_name ?? null,
          avatarUrl: profile?.data?.avatar_url ?? null,
          email: user.email ?? null,
        }}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Business information</h2>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            Full settings
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          This information is used by the AI chatbot to represent your company. You can also edit it in Settings.
        </p>
      </div>
      <BusinessSettingsForm initial={settings?.data ?? undefined} />
    </div>
  );
}
