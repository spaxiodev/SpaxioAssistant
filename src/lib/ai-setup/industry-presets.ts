/**
 * Industry-aware setup presets for the AI Setup Assistant.
 *
 * These presets make the setup experience feel tailored to the business type
 * without splitting the product into separate apps. They surface:
 * - Recommended templates for the industry
 * - Suggested assistant tone and goal
 * - Sample FAQs specific to the industry
 * - Primary CTA focus (quote-first, consultation, FAQ, etc.)
 *
 * The setup assistant uses these to pre-fill suggestions — users always review
 * and can edit before publishing.
 */

import type { AutomationTemplateKey } from './types';

export type IndustryPresetKey =
  | 'home_services'
  | 'agency_consulting'
  | 'local_service_business'
  | 'ecommerce_retail'
  | 'clinic_healthcare'
  | 'saas_software'
  | 'real_estate'
  | 'restaurant_hospitality'
  | 'education_coaching'
  | 'legal_professional'
  | 'general';

export interface IndustryPreset {
  key: IndustryPresetKey;
  displayName: string;
  /** Keywords used to auto-detect from business description or website */
  detectionKeywords: string[];
  tone: string;
  primaryGoal: string;
  suggestedGreeting: string;
  recommendedTemplates: AutomationTemplateKey[];
  /** Primary action focus for this industry */
  primaryCta: 'quote_request_capture' | 'lead_capture' | 'appointment_request_capture' | 'faq_chatbot';
  leadCaptureEnabled: boolean;
  quoteRequestEnabled: boolean;
  sampleFaqs: { q: string; a: string }[];
  /** What info the business should add for best results */
  suggestedKnowledgeSources: string[];
  /** Suggested pricing variables for quote engine (if applicable) */
  suggestedPricingVariables?: string[];
}

export const INDUSTRY_PRESETS: Record<IndustryPresetKey, IndustryPreset> = {
  home_services: {
    key: 'home_services',
    displayName: 'Home Services',
    detectionKeywords: [
      'plumber', 'plumbing', 'electrician', 'electrical', 'hvac', 'contractor',
      'roofing', 'landscaping', 'cleaning', 'painting', 'renovation', 'remodel',
      'home repair', 'handyman', 'pest control', 'flooring', 'windows', 'doors',
      'gutters', 'pool', 'moving', 'junk removal',
    ],
    tone: 'friendly and professional',
    primaryGoal: 'Capture quote requests and leads from homeowners looking for services. Provide quick estimate ranges where pricing is configured.',
    suggestedGreeting: "Hi! I'm here to help you get a fast quote for your project. What can I help with today?",
    recommendedTemplates: ['quote_request_capture', 'lead_capture', 'email_notification'],
    primaryCta: 'quote_request_capture',
    leadCaptureEnabled: true,
    quoteRequestEnabled: true,
    sampleFaqs: [
      { q: 'Do you offer free estimates?', a: 'Yes, we offer free estimates. Tell me about your project and I\'ll collect your details for the team.' },
      { q: 'What areas do you serve?', a: 'We serve [your service area]. Want me to check if we cover your location?' },
      { q: 'How quickly can you come out?', a: 'Availability varies by project. Fill out our quick form and we\'ll confirm timing.' },
      { q: 'Are you licensed and insured?', a: 'Yes, we\'re fully licensed and insured. Happy to provide documentation on request.' },
      { q: 'Do you offer emergency services?', a: 'Yes, we offer emergency services for urgent situations. Let me get your details right away.' },
    ],
    suggestedKnowledgeSources: ['Your website', 'Service list and pricing ranges', 'Service area information', 'FAQs about your process'],
    suggestedPricingVariables: ['service_type', 'square_footage', 'number_of_rooms', 'location_type', 'urgency'],
  },

  agency_consulting: {
    key: 'agency_consulting',
    displayName: 'Agency / Consulting',
    detectionKeywords: [
      'agency', 'consulting', 'consultant', 'marketing agency', 'design agency',
      'web agency', 'digital agency', 'strategy', 'advisory', 'firm', 'studio',
      'branding', 'creative agency',
    ],
    tone: 'professional and confident',
    primaryGoal: 'Capture consultation requests and qualify project inquiries from potential clients.',
    suggestedGreeting: "Hello! I can answer questions about our services and help you get started with a project inquiry.",
    recommendedTemplates: ['lead_capture', 'appointment_request_capture', 'email_notification', 'crm_push'],
    primaryCta: 'lead_capture',
    leadCaptureEnabled: true,
    quoteRequestEnabled: true,
    sampleFaqs: [
      { q: 'What services do you offer?', a: 'We specialize in [your services]. Would you like to discuss your specific project?' },
      { q: 'What\'s your typical project timeline?', a: 'It depends on scope. Most projects take [typical range]. Want to schedule a discovery call?' },
      { q: 'How much do you charge?', a: 'Pricing depends on your requirements. Let me collect some details so we can send you an accurate proposal.' },
      { q: 'Do you work with small businesses?', a: 'Yes, we work with businesses of all sizes. Tell me a bit about your project.' },
    ],
    suggestedKnowledgeSources: ['Your website', 'Case studies or portfolio', 'Services and pricing overview', 'Client testimonials'],
    suggestedPricingVariables: ['project_type', 'scope', 'timeline', 'team_size'],
  },

  local_service_business: {
    key: 'local_service_business',
    displayName: 'Local Service Business',
    detectionKeywords: [
      'salon', 'barber', 'spa', 'gym', 'fitness', 'laundry', 'dry cleaning',
      'auto repair', 'car wash', 'veterinary', 'pet grooming', 'printing',
      'photography', 'tutoring', 'alterations', 'locksmith',
    ],
    tone: 'friendly and helpful',
    primaryGoal: 'Answer common questions about hours, location, and services. Capture contact info for follow-up.',
    suggestedGreeting: "Hi! Happy to help. Ask me anything about our services, hours, or location.",
    recommendedTemplates: ['lead_capture', 'faq_chatbot', 'email_notification'],
    primaryCta: 'lead_capture',
    leadCaptureEnabled: true,
    quoteRequestEnabled: false,
    sampleFaqs: [
      { q: 'What are your hours?', a: 'We\'re open [hours]. You can also contact us through this chat anytime.' },
      { q: 'Where are you located?', a: 'We\'re located at [address]. Need directions?' },
      { q: 'Do you take walk-ins?', a: 'Yes we do! You can also book ahead to avoid wait times.' },
      { q: 'What\'s your pricing?', a: 'Our prices start at [range]. Would you like a more specific quote?' },
    ],
    suggestedKnowledgeSources: ['Your website', 'Service menu with pricing', 'Location and hours', 'FAQs'],
  },

  ecommerce_retail: {
    key: 'ecommerce_retail',
    displayName: 'E-commerce / Retail',
    detectionKeywords: [
      'shop', 'store', 'ecommerce', 'e-commerce', 'retail', 'buy', 'products',
      'clothing', 'fashion', 'accessories', 'online store', 'merchandise',
    ],
    tone: 'helpful and upbeat',
    primaryGoal: 'Answer product questions, help customers find what they need, and capture leads for high-consideration purchases.',
    suggestedGreeting: "Hi! Looking for something specific? I can help you find the right product or answer any questions.",
    recommendedTemplates: ['faq_chatbot', 'support_intake', 'email_notification'],
    primaryCta: 'faq_chatbot',
    leadCaptureEnabled: false,
    quoteRequestEnabled: false,
    sampleFaqs: [
      { q: 'Do you offer free shipping?', a: 'Yes, we offer free shipping on orders over [threshold].' },
      { q: 'What\'s your return policy?', a: 'We have a [X]-day return policy. Full details are on our returns page.' },
      { q: 'Is this item in stock?', a: 'Let me check. Which item are you looking at?' },
      { q: 'How long does delivery take?', a: 'Standard delivery takes [X-Y] business days. Express options are also available.' },
    ],
    suggestedKnowledgeSources: ['Your website', 'Product catalog or top products', 'Shipping and returns policy', 'FAQs'],
  },

  clinic_healthcare: {
    key: 'clinic_healthcare',
    displayName: 'Clinic / Healthcare',
    detectionKeywords: [
      'clinic', 'doctor', 'physician', 'dentist', 'dental', 'therapist',
      'mental health', 'chiropractic', 'physiotherapy', 'optometrist',
      'medical', 'health', 'wellness', 'specialist', 'urgent care',
    ],
    tone: 'warm, professional, and reassuring',
    primaryGoal: 'Answer questions about services and help patients request appointments. Do not provide medical advice.',
    suggestedGreeting: "Hello! I can help answer questions about our services and help you schedule an appointment.",
    recommendedTemplates: ['appointment_request_capture', 'faq_chatbot', 'email_notification'],
    primaryCta: 'appointment_request_capture',
    leadCaptureEnabled: true,
    quoteRequestEnabled: false,
    sampleFaqs: [
      { q: 'Are you accepting new patients?', a: 'Yes, we\'re currently accepting new patients. Would you like to schedule an appointment?' },
      { q: 'Do you accept my insurance?', a: 'We accept most major plans. Please contact us with your insurance details and we\'ll confirm coverage.' },
      { q: 'What are your hours?', a: 'We\'re open [hours]. For emergencies, please call [number] or visit the nearest emergency room.' },
      { q: 'How do I request my records?', a: 'You can request records through our patient portal or by contacting reception.' },
    ],
    suggestedKnowledgeSources: ['Your website', 'Services offered', 'Insurance and payment info', 'Appointment booking info'],
  },

  saas_software: {
    key: 'saas_software',
    displayName: 'SaaS / Software',
    detectionKeywords: [
      'saas', 'software', 'app', 'platform', 'subscription', 'api', 'developer',
      'cloud', 'tool', 'dashboard', 'analytics', 'automation', 'integration',
      'b2b software', 'enterprise software',
    ],
    tone: 'clear, helpful, and tech-savvy',
    primaryGoal: 'Answer product questions, capture trial signups and demo requests, and help users find what they need.',
    suggestedGreeting: "Hey! I can answer questions about the product, pricing, or help you get started.",
    recommendedTemplates: ['lead_capture', 'support_intake', 'faq_chatbot', 'slack_notification'],
    primaryCta: 'lead_capture',
    leadCaptureEnabled: true,
    quoteRequestEnabled: false,
    sampleFaqs: [
      { q: 'Is there a free trial?', a: 'Yes! You can start a free [X]-day trial. Want me to help you sign up?' },
      { q: 'How does pricing work?', a: 'We have [plans]. I can walk you through which plan fits your needs best.' },
      { q: 'Do you have an API?', a: 'Yes, we have a full API. Documentation is at [link].' },
      { q: 'How do I get started?', a: 'Getting started takes just a few minutes. Want me to help you create an account?' },
    ],
    suggestedKnowledgeSources: ['Your website', 'Feature overview and documentation', 'Pricing page', 'Getting started guide'],
  },

  real_estate: {
    key: 'real_estate',
    displayName: 'Real Estate',
    detectionKeywords: [
      'real estate', 'realtor', 'property', 'homes', 'listings', 'broker',
      'apartment', 'condo', 'commercial property', 'rental', 'mortgage',
    ],
    tone: 'professional and approachable',
    primaryGoal: 'Qualify buyer and seller inquiries, capture contact info for follow-up, and answer questions about listings and the process.',
    suggestedGreeting: "Hi! Looking to buy, sell, or just explore? I can help answer your questions and connect you with our team.",
    recommendedTemplates: ['lead_capture', 'appointment_request_capture', 'email_notification'],
    primaryCta: 'lead_capture',
    leadCaptureEnabled: true,
    quoteRequestEnabled: false,
    sampleFaqs: [
      { q: 'Are you currently taking new clients?', a: 'Yes! We\'d love to help you. Let me take your details and someone will be in touch.' },
      { q: 'What areas do you cover?', a: 'We specialize in [area]. Are you looking to buy or sell in this market?' },
      { q: 'How long does the process take?', a: 'The timeline varies but typically [X months] from listing to close. Happy to walk you through it.' },
    ],
    suggestedKnowledgeSources: ['Your website', 'Listings and services', 'Market area and expertise', 'Buyer/seller guides'],
  },

  restaurant_hospitality: {
    key: 'restaurant_hospitality',
    displayName: 'Restaurant / Hospitality',
    detectionKeywords: [
      'restaurant', 'cafe', 'bar', 'bistro', 'hotel', 'hospitality', 'catering',
      'food', 'dining', 'menu', 'reservations', 'events',
    ],
    tone: 'warm and welcoming',
    primaryGoal: 'Answer questions about menus, hours, location, and reservations. Capture inquiries for events and private dining.',
    suggestedGreeting: "Welcome! Ask me about our menu, hours, reservations, or upcoming events.",
    recommendedTemplates: ['lead_capture', 'faq_chatbot', 'email_notification'],
    primaryCta: 'lead_capture',
    leadCaptureEnabled: true,
    quoteRequestEnabled: false,
    sampleFaqs: [
      { q: 'What are your hours?', a: 'We\'re open [hours]. Reservations recommended on weekends.' },
      { q: 'Do you take reservations?', a: 'Yes! You can reserve online or I can pass your info to the team.' },
      { q: 'Do you accommodate dietary restrictions?', a: 'Yes, we have options for [dietary needs]. Let us know when you book.' },
      { q: 'Do you host private events?', a: 'Yes, we offer private dining for groups. Tell me more about your event and I\'ll connect you with our events team.' },
    ],
    suggestedKnowledgeSources: ['Your website', 'Menu', 'Hours and location', 'Private events and catering info'],
  },

  education_coaching: {
    key: 'education_coaching',
    displayName: 'Education / Coaching',
    detectionKeywords: [
      'school', 'education', 'tutor', 'tutoring', 'coaching', 'coach', 'training',
      'course', 'workshop', 'academy', 'learning', 'online course', 'bootcamp',
    ],
    tone: 'encouraging and informative',
    primaryGoal: 'Answer questions about programs, capture enrollment inquiries, and help prospective students or clients get started.',
    suggestedGreeting: "Hi! I can answer questions about our programs and help you take the next step.",
    recommendedTemplates: ['lead_capture', 'appointment_request_capture', 'email_notification'],
    primaryCta: 'lead_capture',
    leadCaptureEnabled: true,
    quoteRequestEnabled: false,
    sampleFaqs: [
      { q: 'What programs do you offer?', a: 'We offer [programs]. Which one are you most interested in?' },
      { q: 'How much do programs cost?', a: 'Pricing varies by program. Let me get your details and we\'ll send you full information.' },
      { q: 'Is there a trial or demo available?', a: 'Yes! We offer [trial/demo option]. Want me to register you?' },
    ],
    suggestedKnowledgeSources: ['Your website', 'Program descriptions and curriculum', 'Pricing and enrollment info', 'FAQs'],
  },

  legal_professional: {
    key: 'legal_professional',
    displayName: 'Legal / Professional Services',
    detectionKeywords: [
      'law', 'lawyer', 'attorney', 'legal', 'law firm', 'accountant', 'accounting',
      'cpa', 'financial advisor', 'insurance', 'notary', 'immigration',
    ],
    tone: 'professional and trustworthy',
    primaryGoal: 'Answer general questions about practice areas and capture consultation requests. Avoid providing specific legal or financial advice.',
    suggestedGreeting: "Hello! I can answer general questions about our services and help you schedule a consultation.",
    recommendedTemplates: ['appointment_request_capture', 'lead_capture', 'email_notification'],
    primaryCta: 'appointment_request_capture',
    leadCaptureEnabled: true,
    quoteRequestEnabled: false,
    sampleFaqs: [
      { q: 'What areas of law do you specialize in?', a: 'We specialize in [practice areas]. Would you like to schedule a consultation?' },
      { q: 'Do you offer free consultations?', a: 'Yes, we offer [free/paid] initial consultations. I can help you book one.' },
      { q: 'How much does it cost?', a: 'Fees vary by matter. We can discuss this in more detail during your consultation.' },
    ],
    suggestedKnowledgeSources: ['Your website', 'Practice areas overview', 'Team bios', 'Consultation process'],
  },

  general: {
    key: 'general',
    displayName: 'General Business',
    detectionKeywords: [],
    tone: 'friendly and professional',
    primaryGoal: 'Answer customer questions, capture leads, and help visitors get in touch.',
    suggestedGreeting: "Hi! I'm here to help. Ask me anything or let me know how I can assist.",
    recommendedTemplates: ['lead_capture', 'faq_chatbot', 'email_notification'],
    primaryCta: 'lead_capture',
    leadCaptureEnabled: true,
    quoteRequestEnabled: false,
    sampleFaqs: [
      { q: 'How can I contact you?', a: 'You can reach us through this chat or at [contact info].' },
      { q: 'What do you offer?', a: 'We offer [your services/products]. What can I help you with?' },
    ],
    suggestedKnowledgeSources: ['Your website', 'Services or product info', 'Contact information', 'FAQs'],
  },
};

/**
 * Detect the best-matching industry preset from a business description or website text.
 * Returns 'general' if no clear match.
 */
export function detectIndustryFromText(text: string): IndustryPresetKey {
  if (!text?.trim()) return 'general';
  const lower = text.toLowerCase();

  const scored: [IndustryPresetKey, number][] = Object.values(INDUSTRY_PRESETS)
    .filter((p) => p.key !== 'general')
    .map((preset) => {
      const matches = preset.detectionKeywords.filter((kw) => lower.includes(kw)).length;
      return [preset.key, matches] as [IndustryPresetKey, number];
    });

  scored.sort((a, b) => b[1] - a[1]);
  const best = scored[0];
  return best && best[1] > 0 ? best[0] : 'general';
}

/** Get the preset for a given industry key. Falls back to 'general'. */
export function getIndustryPreset(key: string | null | undefined): IndustryPreset {
  if (!key) return INDUSTRY_PRESETS.general;
  return INDUSTRY_PRESETS[key as IndustryPresetKey] ?? INDUSTRY_PRESETS.general;
}

/** Get all presets sorted for display. */
export function getAllIndustryPresets(): IndustryPreset[] {
  return Object.values(INDUSTRY_PRESETS).filter((p) => p.key !== 'general');
}
