import { setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/seo';
import { LandingPage } from '@/components/seo/landing-page';

type Props = { params: Promise<{ locale: string }> };

const META = {
  title: 'AI CRM Automation | Automate Leads & Workflows',
  description:
    'Automate CRM with AI. Capture leads from chat, sync contacts, and trigger workflows with Spaxio Assistant. AI CRM automation for sales and support teams.',
};

const CONTENT = {
  heroTitle: 'AI CRM Automation That Captures Every Lead',
  heroSubtitle:
    'Turn website conversations into leads and contacts automatically. Use AI to qualify and route, then trigger CRM workflows so your team never misses an opportunity.',
  sections: [
    {
      title: 'What Is AI CRM Automation?',
      body: `AI CRM automation connects your conversations to your customer data and workflows. When a visitor chats on your website, the AI can capture their contact details, qualify their intent, and create or update a lead or contact in your system. You can then trigger automations—notifications, follow-up emails, or CRM updates—so sales and support stay in sync without manual data entry.

Spaxio Assistant provides AI CRM automation out of the box: leads and quote requests from chat flow into your dashboard, and you can run automations when new leads are captured.`,
    },
    {
      title: 'Capture Leads From Chat Automatically',
      body: `Every conversation on your AI chatbot can become a lead. The system captures email, name, and other details when visitors share them. Quote requests are structured (service, budget, timeline) so you can prioritize and follow up. All of this appears in your Spaxio dashboard and can trigger webhooks or internal workflows. That’s CRM automation without manual forms or copy-paste.`,
    },
    {
      title: 'Reduce Manual Data Entry',
      body: `Manual data entry is slow and error-prone. With AI CRM automation, the AI extracts information from natural conversation and creates leads or contacts for you. Your team gets a single place to review, qualify, and act—and you can still connect to external CRMs via webhooks or future integrations.`,
    },
    {
      title: 'Trigger Workflows When Leads Come In',
      body: `When a new lead or quote request is captured, you can trigger automations: notify the sales team, send a confirmation email, or call an API. Spaxio Assistant’s automation engine lets you define these rules so that every lead is handled consistently and nothing falls through the cracks.`,
    },
    {
      title: 'Scale Your Sales and Support',
      body: `AI CRM automation helps small teams look bigger and large teams stay organized. Whether you’re a solo operator or a growing sales org, Spaxio Assistant scales with you—from a single agent and basic lead capture to multiple agents, higher volume, and custom integrations.`,
    },
  ],
  faq: [
    {
      question: 'Can Spaxio Assistant automate CRM workflows?',
      answer:
        'Yes. Leads and contacts from chat are captured automatically. You can trigger automations when new leads or quote requests come in—for example, notifying your team or calling a webhook—so your CRM stays in sync without manual entry.',
    },
    {
      question: 'Do I need to integrate with another CRM?',
      answer:
        'Spaxio Assistant has built-in lead and contact capture. You can use it as your primary place to manage leads from the website, or use webhooks to push data to your existing CRM or tools.',
    },
    {
      question: 'What is AI CRM automation?',
      answer:
        'AI CRM automation uses AI to capture and qualify leads from conversations, create or update contacts, and trigger follow-up workflows—reducing manual data entry and ensuring no lead is missed.',
    },
  ],
  ctaTitle: 'Automate your CRM with AI',
  ctaDescription: 'Start free. Capture leads from chat and trigger workflows in minutes.',
  ctaPrimary: 'Start free',
  ctaSecondary: 'Explore pricing',
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return buildPageMetadata(
    { title: META.title, description: META.description },
    `/${locale}/ai-crm-automation`
  );
}

export default async function AICRMAutomationPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LandingPage
      locale={locale}
      breadcrumbName="AI CRM Automation"
      path="/ai-crm-automation"
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
