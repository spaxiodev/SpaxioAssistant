import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { SeoLandingPage } from '@/components/seo/landing-page';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'AI Chatbot Widget for Websites',
    description:
      'Add an AI chatbot widget to your website in minutes. Spaxio Assistant provides a custom AI chat widget that answers questions, captures leads, and automates support with one line of code.',
    keywords: ['AI chatbot widget', 'AI widget for website', 'chatbot widget', 'AI chat widget'],
    openGraph: {
      title: 'AI Chatbot Widget for Websites | Spaxio Assistant',
      description:
        'Add an AI chatbot widget to your website in minutes. Custom AI chat widget that answers questions, captures leads, and automates support.',
    },
  };
}

const FEATURES = [
  {
    title: 'One-line embed',
    body: 'Add a single script tag to your site and your AI chatbot widget goes live. No complex integration or coding required.',
  },
  {
    title: 'Trained on your content',
    body: 'Your widget learns from your website and docs so it gives accurate, on-brand answers to visitors.',
  },
  {
    title: 'Lead capture and automation',
    body: 'Capture leads from conversations, trigger workflows, and connect to your CRM so every chat can turn into a qualified lead.',
  },
];

export default async function AiChatbotWidgetPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SeoLandingPage
      title="AI Chatbot Widget for Your Website"
      description="An AI chatbot widget lets visitors talk to an intelligent assistant on your site 24/7. Spaxio Assistant gives you a custom AI chat widget you can embed with one line of code. It answers questions, captures leads, and automates customer support so your team can focus on high-value conversations."
      features={FEATURES}
    />
  );
}
