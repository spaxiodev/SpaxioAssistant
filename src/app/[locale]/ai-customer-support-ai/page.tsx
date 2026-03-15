import { setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { SeoLandingPage } from '@/components/seo/landing-page';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'AI Customer Support Chatbot',
    description:
      'Automate customer support with an AI support chatbot. Spaxio Assistant lets you deploy an AI customer support widget that answers questions and captures tickets 24/7.',
    keywords: ['AI customer support', 'AI support chatbot', 'customer support AI', 'AI support widget'],
    openGraph: {
      title: 'AI Customer Support Chatbot | Spaxio Assistant',
      description:
        'Automate customer support with an AI support chatbot. Answer questions and capture tickets 24/7 on your website.',
    },
  };
}

const FEATURES = [
  {
    title: 'Instant answers',
    body: 'Your AI support chatbot answers common questions immediately so customers get help without waiting and your team avoids repetitive tickets.',
  },
  {
    title: 'Escalation and tickets',
    body: 'When the bot can’t help, it can create a ticket, assign to your team, or collect details so agents have context before they reply.',
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
      title="AI Customer Support Chatbot"
      description="An AI customer support chatbot handles common questions, qualifies issues, and captures tickets so your team can focus on complex cases. Spaxio Assistant gives you an AI support chatbot you can embed on your website. It learns from your help content and workflows so it can resolve issues or escalate with context—improving satisfaction and reducing support load."
      features={FEATURES}
    />
  );
}
