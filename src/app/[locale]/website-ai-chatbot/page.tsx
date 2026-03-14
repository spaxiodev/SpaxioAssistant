import { setRequestLocale } from 'next-intl/server';
import { buildPageMetadata } from '@/lib/seo';
import { LandingPage } from '@/components/seo/landing-page';

type Props = { params: Promise<{ locale: string }> };

const META = {
  title: 'Website AI Chatbot | Add Chat to Your Site',
  description:
    'Add an AI chatbot to your website in minutes. Train it on your content, capture leads, and support visitors 24/7. Customizable widget for any website.',
};

const CONTENT = {
  heroTitle: 'Add an AI Chatbot to Your Website in Minutes',
  heroSubtitle:
    'Deploy a custom AI chatbot on your website. It learns from your content, answers visitor questions, captures leads, and works on any site—with one snippet of code.',
  sections: [
    {
      title: 'Why Add a Website AI Chatbot?',
      body: `Visitors expect instant answers. A website AI chatbot gives them 24/7 support, reduces bounce rate, and turns casual browsers into leads. Unlike a static contact form, the chatbot can ask qualifying questions, explain your services, and collect the right information before handing off to your team. That makes it one of the most effective ways to improve conversion and support on your site.`,
    },
    {
      title: 'Train It on Your Content',
      body: `Your website AI chatbot should sound like you and know your products and policies. With Spaxio Assistant, you connect your website and documents as knowledge sources. The AI uses this content to answer questions accurately—no need to write hundreds of scripted replies. Update your site or docs and the chatbot stays in sync.`,
    },
    {
      title: 'Capture Leads and Quote Requests',
      body: `The chatbot doesn’t just answer questions; it can capture emails, phone numbers, and structured quote requests (service, budget, timeline). Leads and requests appear in your dashboard and can trigger automations—so your sales team is notified the moment a hot lead comes in.`,
    },
    {
      title: 'Customize Look and Position',
      body: `Match your brand: choose colors, position (e.g. bottom-right or bottom-left), and welcome message. The widget is responsive and works on mobile and desktop. It loads asynchronously so it doesn’t slow down your page, and it stays isolated from your site’s CSS.`,
    },
    {
      title: 'Install on Any Website',
      body: `Adding the website AI chatbot is simple. Copy the install code from your Spaxio dashboard and paste it once, just before the closing body tag. It works on WordPress, Shopify, Wix, Squarespace, and custom sites. No app store or complex integration—just one snippet.`,
    },
  ],
  faq: [
    {
      question: 'Can I add an AI chatbot to my website?',
      answer:
        'Yes. With Spaxio Assistant you create an AI chatbot, train it on your website and documents, and add it to your site with a single code snippet. It works on any website and is mobile-friendly.',
    },
    {
      question: 'How long does it take to set up?',
      answer:
        'You can have a basic website AI chatbot live in minutes: sign up, add your website as a knowledge source, and paste the install code. Customization (colors, message, behavior) is done from the dashboard.',
    },
    {
      question: 'Will it work on my website builder?',
      answer:
        'The chatbot works on any site where you can add a small script before the closing body tag—including WordPress, Shopify, Wix, Squarespace, and custom HTML sites.',
    },
  ],
  ctaTitle: 'Deploy your website AI chatbot',
  ctaDescription: 'Start free. Add a custom AI chatbot to your site in minutes.',
  ctaPrimary: 'Start free',
  ctaSecondary: 'Explore pricing',
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return buildPageMetadata(
    { title: META.title, description: META.description },
    `/${locale}/website-ai-chatbot`
  );
}

export default async function WebsiteAIChatbotPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <LandingPage
      locale={locale}
      breadcrumbName="Website AI Chatbot"
      path="/website-ai-chatbot"
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
