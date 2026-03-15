import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { SeoLandingPage } from '@/components/seo/landing-page';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'AI Website Assistant',
    description:
      'Add an AI website assistant to engage visitors and capture leads. Spaxio Assistant provides an intelligent assistant that answers questions and automates support on your site.',
    keywords: ['AI website assistant', 'website AI assistant', 'AI assistant for website', 'virtual assistant website'],
    openGraph: {
      title: 'AI Website Assistant | Spaxio Assistant',
      description:
        'Add an AI website assistant to engage visitors and capture leads. Intelligent support and lead capture on your site.',
    },
  };
}

const FEATURES = [
  {
    title: 'Always-on assistant',
    body: 'Your AI website assistant is available 24/7 to answer questions, guide visitors, and collect leads so you never miss a conversation.',
  },
  {
    title: 'Smart and contextual',
    body: 'Trained on your content, the assistant gives accurate, helpful answers that match your brand and reduce support load.',
  },
  {
    title: 'Integrates with your stack',
    body: 'Connect to your CRM, calendar, and tools so the assistant can book meetings, create leads, and trigger workflows.',
  },
];

export default async function AiWebsiteAssistantPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <SeoLandingPage
      title="AI Website Assistant for Your Business"
      description="An AI website assistant helps visitors find answers, get support, and take action without waiting for a human. Spaxio Assistant gives you an intelligent assistant you can add to any page. It learns from your site, answers common questions, captures leads, and automates follow-up so your team can focus on closing deals."
      features={FEATURES}
    />
  );
}
