import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { SeoLandingPage } from '@/components/seo/landing-page';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'AI Chatbot for Website',
    description:
      'Deploy a custom AI chatbot for your website. Spaxio Assistant helps you create an AI chatbot that learns from your content, captures leads, and automates support.',
    keywords: ['AI chatbot for website', 'custom AI chatbot', 'website chatbot', 'AI chat integration'],
    openGraph: {
      title: 'AI Chatbot for Website | Spaxio Assistant',
      description:
        'Deploy a custom AI chatbot for your website. Learns from your content, captures leads, and automates support.',
    },
  };
}

const FEATURES = [
  {
    title: 'Custom AI chatbot',
    body: 'Build a chatbot that reflects your brand and knows your products, services, and FAQs so visitors get relevant answers.',
  },
  {
    title: 'Easy integration',
    body: 'Embed your AI chatbot on any website with one script. Works with WordPress, Shopify, custom sites, and more.',
  },
  {
    title: 'Conversations that convert',
    body: 'Every chat can capture leads, book demos, or trigger automations so you never miss an opportunity.',
  },
];

export default async function AiChatbotForWebsitePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SeoLandingPage
      title="AI Chatbot for Your Website"
      description="A custom AI chatbot for your website answers visitor questions, qualifies leads, and automates support without extra headcount. Spaxio Assistant lets you create an AI chatbot trained on your content and embed it with one line of code. Perfect for businesses that want 24/7 engagement and higher conversion."
      features={FEATURES}
    />
  );
}
