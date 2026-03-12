import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { sanitizeText, sanitizeFaq } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';

export async function PUT(request: Request) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const body = await request.json().catch(() => ({}));

    const supabase = createAdminClient();

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
      faqPageUrl,
      serviceBasePrices,
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
      widget_label_override: sanitizeText(widgetLabelOverride, 200) || null,
      show_widget_label: typeof showWidgetLabel === 'boolean' ? showWidgetLabel : false,
      faq_page_url: typeof faqPageUrl === 'string' ? sanitizeText(faqPageUrl, 2000) || null : null,
    };
    if (serviceBasePrices != null && typeof serviceBasePrices === 'object' && !Array.isArray(serviceBasePrices)) {
      const cleaned: Record<string, number> = {};
      for (const [k, v] of Object.entries(serviceBasePrices)) {
        if (typeof k === 'string' && typeof v === 'number' && Number.isFinite(v) && v >= 0) {
          cleaned[sanitizeText(k, 200)] = v;
        }
      }
      updatePayload.service_base_prices = cleaned;
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
