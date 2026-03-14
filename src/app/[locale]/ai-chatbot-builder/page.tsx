import { setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/seo';
import { LandingPage } from '@/components/seo/landing-page';

type Props = { params: Promise<{ locale: string }> };

const META = {
  title: 'AI Chatbot Builder for Your Business',
  description:
    'Build a custom AI chatbot with Spaxio Assistant. Train it on your website and docs, customize behavior, and embed it on any site. No coding required.',
};

const CONTENT = {
  heroTitle: 'Build Your Own AI Chatbot in Minutes',
  heroSubtitle:
    'Create a custom AI chatbot trained on your content. Embed it on your website to capture leads, answer questions, and support customers 24/7—no coding required.',
  sections: [
    {
      title: 'Why Use an AI Chatbot Builder?',
      body: `A custom AI chatbot reflects your brand and your knowledge. With an AI chatbot builder like Spaxio Assistant, you connect your website and documents so the bot answers using your actual content—not generic replies. You control the tone, the welcome message, and how it handles quote requests and lead capture. The result is a website chatbot that feels like an extension of your team.`,
    },
    {
      title: 'Train Your Chatbot on Your Content',
      body: `Spaxio Assistant lets you add multiple knowledge sources: your website, PDFs, and other documents. The AI chatbot is trained on this content and uses it to answer visitor questions accurately. You can update or add sources anytime from your dashboard. There’s no need to manually write scripted answers; the chatbot learns from what you already publish.`,
    },
    {
      title: 'Customize Look and Behavior',
      body: `Your chatbot can match your brand. Adjust colors, position (e.g. bottom-right), and welcome message. You can also configure how it handles lead capture: ask for email or phone when appropriate, and route quote requests into your dashboard. The AI chatbot builder gives you full control over both appearance and behavior.`,
    },
    {
      title: 'Embed on Any Website',
      body: `Adding the chatbot to your site is a one-step process: copy the install code and paste it before the closing body tag. The widget works on any website, including WordPress, Shopify, and custom builds. It’s mobile-friendly and doesn’t conflict with your existing CSS. No developers required.`,
    },
    {
      title: 'Beyond Chat: Leads, Quotes, and Automation',
      body: `Spaxio Assistant is more than a simple chatbot. Conversations can create leads and quote requests in your dashboard automatically. You can trigger automations when a new lead is captured—for example, notifying your team or sending a follow-up email. That makes the AI chatbot builder a bridge between your website and your CRM and workflows.`,
    },
  ],
  faq: [
    {
      question: 'Can I add an AI chatbot to my website?',
      answer:
        'Yes. With Spaxio Assistant you create an AI chatbot, train it on your content, and add it to your website using a small snippet of code. The chatbot works on any website and is responsive and customizable.',
    },
    {
      question: 'Do I need to code to build a chatbot?',
      answer:
        'No. The AI chatbot builder is no-code: you connect your website and documents, set your preferences, and paste the install code. You can customize behavior and appearance from the dashboard.',
    },
    {
      question: 'Can the chatbot capture leads?',
      answer:
        'Yes. The chatbot can collect email and other details during conversations. Leads and quote requests are saved in your dashboard and can trigger automations so your team never misses a lead.',
    },
  ],
  ctaTitle: 'Build your AI chatbot',
  ctaDescription: 'Start free. Create and deploy your custom chatbot in minutes.',
  ctaPrimary: 'Start free',
  ctaSecondary: 'Explore pricing',
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return buildPageMetadata(
    { title: META.title, description: META.description },
    `/${locale}/ai-chatbot-builder`
  );
}

export default async function AIChatbotBuilderPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LandingPage
      locale={locale}
      breadcrumbName="AI Chatbot Builder"
      path="/ai-chatbot-builder"
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
