import { setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/seo';
import { LandingPage } from '@/components/seo/landing-page';

type Props = { params: Promise<{ locale: string }> };

const META = {
  title: 'AI Business Automation Platform',
  description:
    'Automate business workflows with AI. Spaxio Assistant combines AI chat, lead capture, automations, and webhooks so you can automate support, sales, and operations.',
};

const CONTENT = {
  heroTitle: 'AI Business Automation That Connects Chat to Workflows',
  heroSubtitle:
    'Use AI to automate support, qualify leads, and run workflows. One platform for AI chat, automations, webhooks, and CRM-style capture—so your business runs smoother.',
  sections: [
    {
      title: 'What Is AI Business Automation?',
      body: `AI business automation means using AI to trigger and run workflows instead of doing everything manually. When a visitor chats on your website, the AI can capture their info, qualify their request, and trigger follow-up actions: notify your team, update a system, or start a process. That’s automation driven by conversation.

Spaxio Assistant is an AI business automation platform: you get AI agents that chat, capture leads and quote requests, and trigger automations and webhooks. So support, sales, and operations can all be connected to the same AI layer.`,
    },
    {
      title: 'From Conversation to Action',
      body: `The best automation starts where the customer is—often in a chat. Spaxio Assistant turns conversations into structured data (leads, quote requests) and then runs automations you define. You can send Slack or email notifications, call webhooks to update other tools, or run internal workflows. The result is fewer manual steps and faster response times.`,
    },
    {
      title: 'One Platform for Chat, CRM, and Workflows',
      body: `Instead of wiring a chatbot to a separate automation tool and another to a CRM, you get one platform. Spaxio Assistant includes the AI chatbot, lead and contact capture, quote request handling, and an automation engine with triggers and actions. That simplifies setup and keeps everything in sync.`,
    },
    {
      title: 'Webhooks and Integrations',
      body: `For custom integrations, use webhooks. When a lead is captured or an event occurs, Spaxio can send a payload to your endpoint. That lets you connect to any CRM, help desk, or internal system. As we add more native integrations, the same automation patterns will apply.`,
    },
    {
      title: 'Scale Automation With Your Business',
      body: `Start with a single automation—e.g. “when new lead, send email.” Add more triggers and actions as you grow. Spaxio Assistant’s plans support more automations, agents, and API access so your AI business automation can grow from a few workflows to a full operations layer.`,
    },
  ],
  faq: [
    {
      question: 'What is an AI automation platform?',
      answer:
        'An AI automation platform lets you build workflows triggered by AI interactions—e.g. when a lead is captured from chat, trigger a notification or webhook. Spaxio Assistant combines AI chat, lead capture, and automations in one platform.',
    },
    {
      question: 'Can I automate follow-ups when someone submits a quote request?',
      answer:
        'Yes. You can create automations that run when a new lead or quote request is captured. For example, notify your team or call a webhook to update your CRM or other tools.',
    },
    {
      question: 'Do I need coding skills to set up automations?',
      answer:
        'No. You configure triggers and actions from the Spaxio Assistant dashboard. For advanced use cases, webhooks let you connect to any API without writing code in our product.',
    },
  ],
  ctaTitle: 'Launch your AI business automation',
  ctaDescription: 'Start free. Build automations that run when leads and requests come in.',
  ctaPrimary: 'Start free',
  ctaSecondary: 'Explore pricing',
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return buildPageMetadata(
    { title: META.title, description: META.description },
    `/${locale}/ai-business-automation`
  );
}

export default async function AIBusinessAutomationPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LandingPage
      locale={locale}
      breadcrumbName="AI Business Automation"
      path="/ai-business-automation"
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
