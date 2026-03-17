import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { SeoLandingPage } from '@/components/seo/landing-page';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'AI Website Assistant Widget',
    description:
      'Add an AI website assistant widget in minutes. It answers questions, captures leads, and collects quote requests with one line of code.',
    keywords: ['AI chat widget', 'AI website assistant widget', 'website widget', 'lead capture', 'quote requests'],
    openGraph: {
      title: 'AI Website Assistant Widget | Spaxio Assistant',
      description:
        'Add an AI website assistant widget in minutes. Answers questions, captures leads, and helps you follow up faster.',
    },
  };
}

const FEATURES = [
  {
    title: 'One-line embed',
    body: 'Add a single script tag to your site and your assistant widget goes live. No complex integration or coding required.',
  },
  {
    title: 'Trained on your content',
    body: 'Your widget learns from your website and docs so it gives accurate, on-brand answers to visitors.',
  },
  {
    title: 'Leads, quotes, and follow-up',
    body: 'Capture leads and quote requests from conversations and set up simple follow-up so you don’t miss inquiries.',
  },
];

export default async function AiChatbotWidgetPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SeoLandingPage
      title="AI Website Assistant Widget"
      description="Put an AI assistant on your website in minutes. It answers questions, captures leads, collects quote requests, and helps customers get what they need—without extra admin work."
      features={FEATURES}
    />
  );
}
