import { setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/seo';
import { LandingPage } from '@/components/seo/landing-page';

type Props = { params: Promise<{ locale: string }> };

const META = {
  title: 'AI Agents for Business | Build & Deploy',
  description:
    'Build AI agents for business with Spaxio Assistant. Create agents that chat, use tools, trigger automations, and capture leads. Deploy on your website or via API.',
};

const CONTENT = {
  heroTitle: 'AI Agents for Business That Do More Than Chat',
  heroSubtitle:
    'Create AI agents that answer questions, capture leads, trigger workflows, and integrate with your tools. Deploy them on your website or use them via API—all from one platform.',
  sections: [
    {
      title: 'What Are AI Agents for Business?',
      body: `AI agents are intelligent assistants that can perform tasks, not just answer questions. Unlike a basic chatbot, an AI agent can use tools (e.g. look up data, call APIs), trigger automations, and follow multi-step workflows. For business, that means agents that qualify leads, triage support, collect quote requests, and sync with your CRM—all from natural conversation.

Spaxio Assistant lets you build multiple AI agents, each with its own knowledge, instructions, and optional tools. You deploy them as website chatbots, embeds, or API endpoints.`,
    },
    {
      title: 'Why Use AI Agents Instead of a Simple Chatbot?',
      body: `Simple chatbots are scripted or limited to Q&A. AI agents can take action: they can create a lead in your system when a visitor shares contact info, trigger a webhook when a quote request is submitted, or run custom logic via tool calling. That makes them ideal for sales qualification, customer support, and business automation.

Spaxio Assistant combines the conversational quality of an AI chatbot with the power of agents: you get one place to design, train, and deploy AI that actually moves your business forward.`,
    },
    {
      title: 'Train Agents on Your Business Knowledge',
      body: `Each agent can be trained on your website, documents, and FAQs. You set the tone and instructions so the agent stays on brand. Knowledge is updated from your dashboard—add or remove sources anytime. That way your AI agents for business always reflect your latest products, services, and policies.`,
    },
    {
      title: 'Automations and Webhooks',
      body: `When a visitor becomes a lead or submits a quote request, you can trigger automations: notify your team, update a CRM, or call a webhook. Spaxio Assistant’s automation engine connects your AI agents to the rest of your stack, so every conversation can drive a workflow.`,
    },
    {
      title: 'Scale From One Agent to Many',
      body: `Start with a single AI agent for your website. As you grow, add agents for different use cases—support, sales, internal tools—and deploy them where they’re needed. Our plans support multiple agents, so your business can scale its AI footprint without switching platforms.`,
    },
  ],
  faq: [
    {
      question: 'What is an AI agent for business?',
      answer:
        'An AI agent is an intelligent assistant that can converse and take action—using tools, triggering automations, and capturing leads. Spaxio Assistant lets you build such agents, train them on your content, and deploy them on your website or via API.',
    },
    {
      question: 'How are AI agents different from chatbots?',
      answer:
        'Chatbots typically only answer questions. AI agents can also perform tasks: capture leads, run workflows, call APIs, and trigger automations. Spaxio Assistant’s agents combine conversation with these capabilities.',
    },
    {
      question: 'Can I have multiple AI agents?',
      answer:
        'Yes. You can create multiple agents for different roles (e.g. support, sales) and deploy them on different pages or endpoints. Plans vary by number of agents and message volume.',
    },
  ],
  ctaTitle: 'Build your first AI agent',
  ctaDescription: 'Start free. Create an AI agent and deploy it on your website in minutes.',
  ctaPrimary: 'Start free',
  ctaSecondary: 'Explore pricing',
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return buildPageMetadata(
    { title: META.title, description: META.description },
    `/${locale}/ai-agents-for-business`
  );
}

export default async function AIAgentsForBusinessPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LandingPage
      locale={locale}
      breadcrumbName="AI Agents for Business"
      path="/ai-agents-for-business"
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
