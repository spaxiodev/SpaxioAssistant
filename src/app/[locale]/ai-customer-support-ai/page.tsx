import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { SeoLandingPage } from '@/components/seo/landing-page';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'AI Customer Support Assistant',
    description:
      'Handle customer support with an AI assistant that answers questions and captures details 24/7 on your website.',
    keywords: ['AI customer support', 'customer support AI', 'AI support widget', 'website assistant'],
    openGraph: {
      title: 'AI Customer Support Assistant | Spaxio Assistant',
      description:
        'Answer common questions and capture details 24/7 on your website with an AI support assistant.',
    },
  };
}

const FEATURES = [
  {
    title: 'Instant answers',
    body: 'Your AI support assistant answers common questions immediately so customers get help without waiting and your team avoids repetitive tickets.',
  },
  {
    title: 'Escalation and tickets',
    body: 'When the assistant can’t help, it can collect details for your team so you have context before you reply.',
  },
  {
    title: 'One widget for support and sales',
    body: 'Use the same AI widget for support and lead generation. Qualify visitors, capture leads, and resolve issues from one conversation.',
  },
];

export default async function AiCustomerSupportAiPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SeoLandingPage
      title="AI Customer Support Assistant"
      description="An AI support assistant handles common questions, collects details, and helps customers get answers faster—so your team can focus on complex cases. It learns from your help content and can hand off to a human with context."
      features={FEATURES}
    />
  );
}
