import { setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/seo';
import { LandingPage } from '@/components/seo/landing-page';

type Props = { params: Promise<{ locale: string }> };

const META = {
  title: 'Customer Support AI | Automate Support With AI',
  description:
    'Use AI for customer support. Spaxio Assistant answers questions from your knowledge base, captures tickets, and triggers follow-ups—24/7 on your website.',
};

const CONTENT = {
  heroTitle: 'Customer Support AI That Answers and Triages 24/7',
  heroSubtitle:
    'Deploy an AI assistant trained on your docs and FAQs. It answers customer questions instantly, captures details when needed, and can trigger follow-up workflows so your team focuses on complex cases.',
  sections: [
    {
      title: 'Why Use AI for Customer Support?',
      body: `Customers expect fast answers. Customer support AI can respond instantly, 24/7, using your knowledge base—reducing wait times and freeing your team for issues that need a human. When the AI can’t resolve something, it can collect context and create a ticket or notify your team, so handoffs are smooth and nothing is lost.`,
    },
    {
      title: 'Train the AI on Your Knowledge Base',
      body: `Spaxio Assistant lets you connect your website, help docs, and other content as knowledge sources. The customer support AI uses this to answer questions accurately and in your brand voice. You can add or update sources anytime, so the AI always reflects your latest policies and product info.`,
    },
    {
      title: 'Capture Details and Create Tickets',
      body: `When a visitor needs human help, the AI can collect their name, email, and a summary of the issue. That information can be stored in your dashboard and trigger automations—e.g. create a ticket, notify support, or send a confirmation email. So every conversation is tracked and actionable.`,
    },
    {
      title: 'Reduce Repetitive Questions',
      body: `Many support questions are repetitive: shipping, returns, hours, pricing. Customer support AI handles these from your knowledge base, so your team spends less time on FAQs and more on complex or sensitive issues. That improves both efficiency and customer satisfaction.`,
    },
    {
      title: 'Scale Support Without Scaling Headcount',
      body: `As traffic grows, the same AI can handle more conversations. You don’t need to add support staff for every peak. Spaxio Assistant scales with your message volume and number of agents, so your customer support AI grows with your business.`,
    },
  ],
  faq: [
    {
      question: 'What is customer support AI?',
      answer:
        'Customer support AI is an AI assistant that answers customer questions using your knowledge base, captures details when escalation is needed, and can trigger workflows like ticket creation or team notifications. Spaxio Assistant provides this on your website 24/7.',
    },
    {
      question: 'Can the AI handle complex support issues?',
      answer:
        'The AI handles common questions from your docs and FAQs. For complex or sensitive issues, it can collect context and hand off to your team—with full conversation history so agents have the full picture.',
    },
    {
      question: 'How do I train the support AI?',
      answer:
        'You connect your website, help docs, and other content as knowledge sources in Spaxio Assistant. The AI uses this content to answer questions. Update or add sources anytime from your dashboard.',
    },
  ],
  ctaTitle: 'Add customer support AI to your site',
  ctaDescription: 'Start free. Deploy an AI assistant trained on your knowledge base.',
  ctaPrimary: 'Start free',
  ctaSecondary: 'Explore pricing',
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return buildPageMetadata(
    { title: META.title, description: META.description },
    `/${locale}/customer-support-ai`
  );
}

export default async function CustomerSupportAIPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LandingPage
      locale={locale}
      breadcrumbName="Customer Support AI"
      path="/customer-support-ai"
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
