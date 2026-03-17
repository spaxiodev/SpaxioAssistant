import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { SeoLandingPage } from '@/components/seo/landing-page';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'AI Website Assistant',
    description:
      'Add an AI website assistant that learns your business, answers customer questions, captures leads, and collects quote requests.',
    keywords: ['AI website assistant', 'website AI assistant', 'AI chat widget', 'lead capture', 'quote requests'],
    openGraph: {
      title: 'AI Website Assistant | Spaxio Assistant',
      description:
        'Add an AI website assistant that learns your content, captures leads, and helps customers get answers faster.',
    },
  };
}

const FEATURES = [
  {
    title: 'An assistant that learns your business',
    body: 'Teach it your services, FAQs, and policies from your website and files so customers get accurate answers.',
  },
  {
    title: 'Easy integration',
    body: 'Install on your website with one script. Works with WordPress, Shopify, custom sites, and more.',
  },
  {
    title: 'Capture leads and quote requests',
    body: 'Turn conversations into measurable results: capture leads, collect quote requests, and automate simple follow‑up.',
  },
];

export default async function AiChatbotForWebsitePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SeoLandingPage
      title="AI Website Assistant"
      description="An AI assistant on your website that answers customer questions, captures leads, collects quote requests, and helps you follow up faster. Spaxio Assistant learns from your content and installs with one line of code."
      features={FEATURES}
    />
  );
}
