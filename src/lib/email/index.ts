/**
 * Centralized email templates for Spaxio Assistant notifications.
 * All notification emails use branded HTML + plain-text fallback.
 */

import type { AutomationRunInput } from '@/lib/automations/types';
import { renderLeadNotificationEmail, leadDataFromInput } from './templates/lead-notification';
import { renderQuoteRequestNotificationEmail } from './templates/quote-request-notification';
import { renderContactFormNotificationEmail } from './templates/contact-form-notification';
import { renderGenericNotificationEmail } from './templates/generic-notification';
import type { LeadNotificationData } from './templates/lead-notification';
import type { QuoteRequestNotificationData } from './templates/quote-request-notification';
import type { ContactFormNotificationData } from './templates/contact-form-notification';
import { formatValue } from './utils';

export { escapeHtml, formatValue, getAppBaseUrl } from './utils';
export { emailLayout, fieldRow } from './layout';
export { renderLeadNotificationEmail, leadDataFromInput } from './templates/lead-notification';
export { renderQuoteRequestNotificationEmail } from './templates/quote-request-notification';
export { renderContactFormNotificationEmail } from './templates/contact-form-notification';
export { renderGenericNotificationEmail } from './templates/generic-notification';
export { renderQuoteRequestConfirmationEmail } from './templates/quote-request-confirmation';
export type { QuoteRequestConfirmationData } from './templates/quote-request-confirmation';

export type { LeadNotificationData, QuoteRequestNotificationData, ContactFormNotificationData };

/** Get HTML + text for automation email based on trigger type. Replaces raw JSON default. */
export function getAutomationNotificationEmail(params: {
  input: AutomationRunInput;
  automationName?: string;
  businessName?: string;
}): { html: string; text: string } {
  const { input, automationName, businessName } = params;

  switch (input.trigger_type) {
    case 'lead_form_submitted': {
      const data = leadDataFromInput(input, businessName);
      return renderLeadNotificationEmail(data);
    }
    case 'quote_request_submitted': {
      const data: QuoteRequestNotificationData = {
        customer_name: formatValue(input.customer_name) || formatValue(input.lead?.name) || '—',
        customer_email: formatValue(input.customer_email) || formatValue(input.lead?.email) || '—',
        customer_phone: (input.customer_phone as string) ?? input.lead?.phone ?? null,
        requested_service: (input.service_type as string) ?? null,
        estimate_total: input.estimate_total as number ?? null,
        estimate_low: input.estimate_low as number ?? null,
        estimate_high: input.estimate_high as number ?? null,
        form_answers: (input.form_answers as Record<string, unknown>) ?? null,
        quote_request_id: input.quote_request_id as string ?? null,
      };
      return renderQuoteRequestNotificationEmail(data);
    }
    default:
      return renderGenericNotificationEmail(input, { automationName });
  }
}
