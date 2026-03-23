import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { sanitizeText, sanitizeFaq } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';
import { canRemoveBranding } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';

/** GET /api/settings – return business settings for Simple Mode / client forms. */
export async function GET() {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('business_settings')
      .select(
        'business_name, industry, company_description, services_offered, contact_email, phone, lead_notification_email, primary_brand_color, chatbot_name, chatbot_welcome_message, website_url'
      )
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      return NextResponse.json({});
    }

    const row = data as Record<string, unknown>;
    return NextResponse.json({
      business_name: row.business_name ?? null,
      industry: row.industry ?? null,
      company_description: row.company_description ?? null,
      services_offered: row.services_offered ?? null,
      contact_email: row.contact_email ?? null,
      phone: row.phone ?? null,
      lead_notification_email: row.lead_notification_email ?? null,
      primary_brand_color: row.primary_brand_color ?? null,
      chatbot_name: row.chatbot_name ?? null,
      chatbot_welcome_message: row.chatbot_welcome_message ?? null,
      website_url: row.website_url ?? null,
    });
  } catch (err) {
    return handleApiError(err, 'settings/GET');
  }
}

export async function PUT(request: Request) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const body = await request.json().catch(() => ({}));

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    const brandingAllowed = await canRemoveBranding(supabase, organizationId, adminAllowed);

    const {
      businessName,
      industry,
      companyDescription,
      servicesOffered,
      pricingNotes,
      faq,
      toneOfVoice,
      contactEmail,
      phone,
      leadNotificationEmail,
      primaryBrandColor,
      chatbotName,
      chatbotWelcomeMessage,
      widgetLogoUrl,
      widgetLabelOverride,
      showWidgetLabel,
      widgetEnabled,
      faqPageUrl,
      serviceBasePrices,
      websiteUrl,
      defaultLanguage,
      supportedLanguages,
      autoDetectWebsiteLanguage,
      fallbackLanguage,
      matchAIResponseToWebsiteLanguage,
      showLanguageSwitcher,
      customTranslations,
      widgetActionMappings,
    } = body;

    const updatePayload: Record<string, unknown> = {
      business_name: sanitizeText(businessName, 500) || null,
      industry: sanitizeText(industry, 200) || null,
      company_description: sanitizeText(companyDescription, 4000) || null,
      services_offered: Array.isArray(servicesOffered) ? servicesOffered.map((s: unknown) => sanitizeText(s, 200)) : [],
      pricing_notes: sanitizeText(pricingNotes, 1000) || null,
      faq: sanitizeFaq(faq),
      tone_of_voice: sanitizeText(toneOfVoice, 200) || null,
      contact_email: sanitizeText(contactEmail, 320) || null,
      phone: sanitizeText(phone, 50) || null,
      lead_notification_email: sanitizeText(leadNotificationEmail, 320) || null,
      primary_brand_color: sanitizeText(primaryBrandColor, 50) || null,
      chatbot_name: sanitizeText(chatbotName, 200) || null,
      chatbot_welcome_message: sanitizeText(chatbotWelcomeMessage, 500) || null,
      widget_logo_url: sanitizeText(widgetLogoUrl, 2000) || null,
      widget_label_override: brandingAllowed ? (sanitizeText(widgetLabelOverride, 200) || null) : null,
      show_widget_label: brandingAllowed && typeof showWidgetLabel === 'boolean' ? showWidgetLabel : true,
      widget_enabled: typeof widgetEnabled === 'boolean' ? widgetEnabled : true,
      faq_page_url: typeof faqPageUrl === 'string' ? sanitizeText(faqPageUrl, 2000) || null : null,
      website_url: typeof websiteUrl === 'string' ? sanitizeText(websiteUrl, 2000) || null : null,
      default_language: typeof defaultLanguage === 'string' ? sanitizeText(defaultLanguage, 16) || 'en' : undefined,
      fallback_language: typeof fallbackLanguage === 'string' ? sanitizeText(fallbackLanguage, 16) || 'en' : undefined,
      auto_detect_website_language: typeof autoDetectWebsiteLanguage === 'boolean' ? autoDetectWebsiteLanguage : undefined,
      match_ai_response_to_website_language: typeof matchAIResponseToWebsiteLanguage === 'boolean' ? matchAIResponseToWebsiteLanguage : undefined,
      show_language_switcher: typeof showLanguageSwitcher === 'boolean' ? showLanguageSwitcher : undefined,
    };
    if (Array.isArray(supportedLanguages)) {
      const langs = supportedLanguages
        .filter((l): l is string => typeof l === 'string')
        .map((l) => sanitizeText(l, 8).toLowerCase())
        .filter(Boolean);
      if (langs.length > 0) updatePayload.supported_languages = langs;
    }
    if (customTranslations != null && typeof customTranslations === 'object' && !Array.isArray(customTranslations)) {
      const cleaned: Record<string, Record<string, string>> = {};
      for (const [lang, dict] of Object.entries(customTranslations)) {
        if (typeof dict === 'object' && dict !== null && !Array.isArray(dict)) {
          const inner: Record<string, string> = {};
          for (const [k, v] of Object.entries(dict)) {
            if (typeof v === 'string') inner[k] = sanitizeText(v, 500);
          }
          cleaned[sanitizeText(lang, 8)] = inner;
        }
      }
      updatePayload.custom_translations = cleaned;
    }
    if (serviceBasePrices != null && typeof serviceBasePrices === 'object' && !Array.isArray(serviceBasePrices)) {
      const cleaned: Record<string, number> = {};
      for (const [k, v] of Object.entries(serviceBasePrices)) {
        if (typeof k === 'string' && typeof v === 'number' && Number.isFinite(v) && v >= 0) {
          cleaned[sanitizeText(k, 200)] = v;
        }
      }
      updatePayload.service_base_prices = cleaned;
    }
    const ALLOWED_ACTION_TYPES = ['open_contact_form', 'open_quote_form', 'open_booking_form', 'show_pricing', 'scroll_to_section', 'open_link'];
    if (widgetActionMappings != null && typeof widgetActionMappings === 'object' && !Array.isArray(widgetActionMappings)) {
      const cleaned: Record<string, { selector?: string; url?: string; section_id?: string }> = {};
      for (const [key, val] of Object.entries(widgetActionMappings)) {
        if (!ALLOWED_ACTION_TYPES.includes(key)) continue;
        if (val && typeof val === 'object' && !Array.isArray(val)) {
          const v = val as Record<string, unknown>;
          cleaned[key] = {};
          if (typeof v.selector === 'string') cleaned[key].selector = sanitizeText(v.selector, 500);
          if (typeof v.url === 'string') cleaned[key].url = sanitizeText(v.url, 2000);
          if (typeof v.section_id === 'string') cleaned[key].section_id = sanitizeText(v.section_id, 200).replace(/[^a-zA-Z0-9_-]/g, '');
        }
      }
      updatePayload.widget_action_mappings = cleaned;
    }
    const { error } = await supabase
      .from('business_settings')
      .update(updatePayload)
      .eq('organization_id', organizationId);

    if (error) {
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err, 'settings/PUT');
  }
}
