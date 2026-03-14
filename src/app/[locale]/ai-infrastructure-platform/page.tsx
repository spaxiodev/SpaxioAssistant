import { setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/seo';
import { LandingPage } from '@/components/seo/landing-page';

type Props = { params: Promise<{ locale: string }> };

const META = {
  title: 'AI Infrastructure Platform for Businesses',
  description:
    'Spaxio Assistant is an AI infrastructure platform that lets you build AI agents, chatbots, and CRM automations. Deploy enterprise-grade AI for your business in minutes.',
};

const CONTENT = {
  heroTitle: 'AI Infrastructure Platform for Modern Businesses',
  heroSubtitle:
    'One platform to build AI agents, deploy website chatbots, automate CRM and lead workflows, and scale your business with AI—without building from scratch.',
  sections: [
    {
      title: 'What Is an AI Infrastructure Platform?',
      body: `An AI infrastructure platform gives your business the building blocks to create, deploy, and manage AI-powered applications in one place. Instead of stitching together separate tools for chat, automation, and CRM, you get a unified system: AI agents that can converse, use tools, and trigger workflows; knowledge bases trained on your content; and deployment to your website or API.

Spaxio Assistant is designed as an AI infrastructure platform from the ground up. You create agents, connect your website and documents as knowledge sources, define automations and webhooks, and deploy a custom AI assistant or chatbot wherever you need it.`,
    },
    {
      title: 'Why Businesses Choose an AI Infrastructure Approach',
      body: `Generic chatbots are limited to Q&A. To truly automate support, qualify leads, and streamline operations, you need AI that can take action: capture leads into your CRM, trigger follow-up workflows, and integrate with your existing tools. An AI infrastructure platform like Spaxio Assistant provides that capability.

Businesses use our platform to run AI chatbots on their websites, automate lead and contact capture, handle quote requests, and connect AI to internal processes via webhooks and integrations. The result is a single, scalable AI layer that grows with your business.`,
    },
    {
      title: 'Key Capabilities of Spaxio Assistant',
      body: `Our AI infrastructure includes: custom AI agents you can train and configure; a powerful AI chatbot builder for your website; CRM-style lead and contact capture with automations; tool calling and webhooks for custom logic; and flexible deployment (widget, embed, or API). Whether you need a simple website chatbot or a full AI operations layer, the platform scales with you.`,
    },
    {
      title: 'Deploy AI Infrastructure in Minutes',
      body: `Getting started doesn’t require a large IT team. Sign up, create your first agent, connect your website or documents as knowledge sources, and add the install code to your site. Your AI chatbot goes live immediately. From there, you can add automations, multiple agents, and API access as your needs grow. Spaxio Assistant is built for both small businesses and enterprises.`,
    },
  ],
  faq: [
    {
      question: 'What is an AI infrastructure platform?',
      answer:
        'An AI infrastructure platform is a system that lets businesses build, deploy, and manage AI applications—such as AI chatbots, AI agents, and automated workflows—in one place. Spaxio Assistant provides agents, knowledge, automations, CRM-style capture, and deployment so you can run AI across your website and operations.',
    },
    {
      question: 'How is this different from a simple chatbot?',
      answer:
        'Simple chatbots only answer questions. An AI infrastructure platform like Spaxio Assistant adds AI agents that can use tools and trigger automations, capture leads and contacts, handle quote requests, and integrate via webhooks—giving you a full AI layer for business automation.',
    },
    {
      question: 'Is Spaxio Assistant suitable for enterprises?',
      answer:
        'Yes. We offer plans that scale from small teams to enterprise, with multiple agents, higher message volumes, API access, and dedicated support. Your AI infrastructure can grow with your organization.',
    },
  ],
  ctaTitle: 'Launch your AI infrastructure',
  ctaDescription: 'Start free. Build your first AI agent and website chatbot in minutes.',
  ctaPrimary: 'Start free',
  ctaSecondary: 'Explore pricing',
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return buildPageMetadata(
    { title: META.title, description: META.description },
    `/${locale}/ai-infrastructure-platform`
  );
}

export default async function AIInfrastructurePlatformPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LandingPage
      locale={locale}
      breadcrumbName="AI Infrastructure Platform"
      path="/ai-infrastructure-platform"
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
