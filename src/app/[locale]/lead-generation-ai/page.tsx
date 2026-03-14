import { setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/seo';
import { LandingPage } from '@/components/seo/landing-page';

type Props = { params: Promise<{ locale: string }> };

const META = {
  title: 'Lead Generation AI | Capture & Qualify Leads With AI',
  description:
    'Use AI for lead generation. Capture and qualify leads from your website chat automatically. Spaxio Assistant turns conversations into leads and triggers follow-up workflows.',
};

const CONTENT = {
  heroTitle: 'Lead Generation AI That Converts Visitors Into Leads',
  heroSubtitle:
    'Turn website conversations into qualified leads automatically. Your AI captures contact details and intent, so your sales team gets warm leads instead of cold forms.',
  sections: [
    {
      title: 'Why Use AI for Lead Generation?',
      body: `Traditional forms capture data but not context. Lead generation AI engages visitors in conversation, answers their questions, and collects contact details and intent when the time is right. That means more leads, better qualification, and less friction than long forms. Spaxio Assistant’s AI chatbot does this on your website 24/7—capturing leads even when your team is offline.`,
    },
    {
      title: 'Capture Leads From Natural Conversation',
      body: `When a visitor is interested, the AI can ask for email, phone, or other details in the flow of conversation. Those leads appear in your dashboard with conversation context, so you know what they asked about and how ready they are. Quote requests are structured (service, budget, timeline) so you can prioritize follow-up.`,
    },
    {
      title: 'Qualify Without Manual Triage',
      body: `The AI can ask qualifying questions and summarize intent. You see which leads are hot (e.g. ready for a quote) versus just browsing. That helps sales focus on the right prospects and automates early-stage qualification so no lead slips through.`,
    },
    {
      title: 'Trigger Follow-Up Automatically',
      body: `When a new lead is captured, you can trigger automations: notify your team, send a follow-up email, or push the lead to your CRM via webhook. Spaxio Assistant’s automation engine keeps your pipeline in sync so every lead gets a timely response.`,
    },
    {
      title: 'Scale Lead Capture With Traffic',
      body: `More traffic doesn’t have to mean more manual work. Lead generation AI handles more conversations without extra headcount. Spaxio Assistant scales with your message volume and number of agents, so you can grow campaigns without drowning in unqualified leads.`,
    },
  ],
  faq: [
    {
      question: 'What is lead generation AI?',
      answer:
        'Lead generation AI uses conversational AI to engage website visitors, answer questions, and capture contact details and intent when they’re ready. It turns chat into structured leads and can trigger follow-up workflows so sales never miss an opportunity.',
    },
    {
      question: 'Can the AI qualify leads?',
      answer:
        'Yes. The AI can ask qualifying questions and capture context (e.g. service interest, budget, timeline). Leads in your dashboard include this context so you can prioritize and follow up effectively.',
    },
    {
      question: 'What happens when a lead is captured?',
      answer:
        'Leads appear in your Spaxio Assistant dashboard. You can also trigger automations—e.g. notify your team or call a webhook to add the lead to your CRM—so follow-up is immediate and consistent.',
    },
  ],
  ctaTitle: 'Start capturing leads with AI',
  ctaDescription: 'Start free. Deploy lead generation AI on your website in minutes.',
  ctaPrimary: 'Start free',
  ctaSecondary: 'Explore pricing',
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return buildPageMetadata(
    { title: META.title, description: META.description },
    `/${locale}/lead-generation-ai`
  );
}

export default async function LeadGenerationAIPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LandingPage
      locale={locale}
      breadcrumbName="Lead Generation AI"
      path="/lead-generation-ai"
      heroTitle={CONTENT.heroTitle}
      heroSubtitle={CONTENT.heroSubtitle}
      sections={CONTENT.sections}
      faq={CONTENT.faq}
      ctaTitle={CONTENT.ctaTitle}
      ctaDescription={CONTENT.ctaDescription}
      ctaPrimaryHref="/signup"
      ctaPrimaryLabel={CONTENT.ctaPrimary}
      ctaSecondaryHref="/pricing"
      ctaSecondaryLabel={CONTENT.ctaSecondary}
    />
  );
}
