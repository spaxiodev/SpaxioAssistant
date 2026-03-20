import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPlanAccess } from '@/lib/plan-access';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { UpgradeRequiredCard } from '@/components/upgrade-required-card';
import { EmailAutomationClient } from '@/components/dashboard/email-automation/email-automation-client';
import { headers } from 'next/headers';
import { getPublicAppUrl } from '@/lib/app-url';
import type {
  EmailAutomationSettings,
  EmailProvider,
  EmailReplyTemplate,
  InboundEmail,
} from '@/lib/email-automation/types';

export const dynamic = 'force-dynamic';

const DEFAULT_SETTINGS: Omit<EmailAutomationSettings, 'id' | 'organization_id' | 'created_at' | 'updated_at'> = {
  enabled: false,
  fallback_language: 'en',
  ai_enhancement_enabled: false,
  tone_preset: 'professional',
  business_hours_enabled: false,
  business_hours_json: null,
  away_message_enabled: false,
  away_message_text: null,
  away_message_language: 'en',
  max_auto_replies_per_thread: 1,
  cooldown_hours: 24,
  ai_translate_enabled: true,
};

export default async function EmailAutomationPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const planAccess = await getPlanAccess(supabase, orgId, adminAllowed);

  if (!planAccess.featureAccess.email_automation) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Auto Replies</h1>
          <p className="text-muted-foreground">
            Automatically reply to incoming customer emails in their language.
          </p>
        </div>
        <UpgradeRequiredCard
          featureKey="email_automation"
          currentPlanName={planAccess.planName}
          from="email-automation"
        />
      </div>
    );
  }

  const headersList = await headers();
  const baseUrl = getPublicAppUrl({ headers: headersList }).replace(/\/$/, '');

  const [settingsRes, templatesRes, providersRes, inboundRes] = await Promise.all([
    supabase
      .from('email_automation_settings')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle(),
    supabase
      .from('email_reply_templates')
      .select('*')
      .eq('organization_id', orgId)
      .order('language_code'),
    supabase
      .from('email_providers')
      .select('id,provider_type,display_name,status,status_message,inbound_webhook_token,last_checked_at,connected_at,created_at,updated_at')
      .eq('organization_id', orgId)
      .order('created_at'),
    supabase
      .from('inbound_emails')
      .select('id,sender_email,sender_name,subject,detected_language,processing_status,skip_reason,lead_id,received_at,processed_at')
      .eq('organization_id', orgId)
      .order('received_at', { ascending: false })
      .limit(50),
  ]);

  const settings = (settingsRes.data as EmailAutomationSettings | null) ?? {
    ...DEFAULT_SETTINGS,
    id: '',
    organization_id: orgId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const templates = (templatesRes.data as EmailReplyTemplate[]) ?? [];
  const providers = (providersRes.data as EmailProvider[]) ?? [];
  const inboundEmails = (inboundRes.data as InboundEmail[]) ?? [];

  return (
    <EmailAutomationClient
      initialSettings={settings}
      initialTemplates={templates}
      initialProviders={providers}
      initialInboundEmails={inboundEmails}
      baseUrl={baseUrl}
    />
  );
}
