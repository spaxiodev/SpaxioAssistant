import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { SetLocaleAttr } from '@/components/set-locale-attr';
import { ThemeProvider } from '@/components/theme-provider';
import { TermsGate } from '@/components/terms-gate';
import { JsonLd } from '@/components/seo/json-ld';
import { AnalyticsHooks } from '@/components/seo/analytics-hooks';
import { getSiteUrl, SITE_NAME, DEFAULT_SEO, DEFAULT_OPEN_GRAPH, DEFAULT_TWITTER } from './seo';

const GOOGLE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
const BING_VERIFICATION = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim();

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

function buildMetadata() {
  const baseUrl = getSiteUrl();
  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: DEFAULT_SEO.title,
      template: `%s | ${SITE_NAME}`,
    },
    description: DEFAULT_SEO.description,
    keywords: [...DEFAULT_SEO.keywords],
    alternates: {
      canonical: '/',
    },
    openGraph: {
      ...DEFAULT_OPEN_GRAPH,
      url: baseUrl,
      images: [{ url: `${baseUrl}/icon.png`, width: 512, height: 512, alt: SITE_NAME }],
    },
    twitter: DEFAULT_TWITTER,
    robots: {
      index: true,
      follow: true,
    },
    icons: {
      icon: { url: '/icon.png', type: 'image/png' },
    },
    ...(GOOGLE_VERIFICATION ? { verification: { google: GOOGLE_VERIFICATION } as const } : {}),
    ...(BING_VERIFICATION ? { other: { 'msvalidate.01': BING_VERIFICATION } } : {}),
  };
}

export const metadata: Metadata = buildMetadata();

async function getMessagesSafe() {
  try {
    return await getMessages();
  } catch {
    return (await import('../../messages/en.json')).default;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessagesSafe();
  const baseUrl = getSiteUrl();
  const jsonLdData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: baseUrl,
      logo: `${baseUrl}/icon.png`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: SITE_NAME,
      description: 'AI website assistant platform: chat widget or full-page assistant that learns from your site, answers questions using your content, captures and qualifies leads with AI, collects quote requests with configurable forms and estimates, and automates follow-up workflows.',
      url: baseUrl,
      category: 'Business Software',
      brand: { '@type': 'Brand', name: SITE_NAME },
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'USD',
        lowPrice: '0',
        highPrice: '99',
        offerCount: '5',
        description: 'Free tier and paid plans for AI chatbot, automation, and CRM.',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: baseUrl,
      description: 'AI website assistant platform: add one script for a chat widget or full-page assistant. Learns from your website, answers questions, captures and qualifies leads with AI, collects quote requests with configurable forms and pricing rules, automates follow-up, optional voice—so you miss fewer inquiries and respond faster.',
      featureList: [
        'Chat widget or full-page assistant (one script install)',
        'Learn from your website—AI extracts business info, FAQs, services',
        'Knowledge base (URLs and file uploads) for AI answers',
        'Lead capture with AI qualification (score, priority, summary)',
        'Quote requests with configurable form and pricing rules for estimates',
        'Automations (notify on lead, follow up after quote, webhooks)',
        'Optional voice conversations (plan-gated)',
        'Team management with roles',
        'Inbox for human replies (plan-gated)',
      ],
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Subscription plans from free to enterprise',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: baseUrl,
      description: 'AI website assistant platform: chat widget or full-page assistant, learns from your site, captures and qualifies leads, collects quote requests with estimates, automates follow-up.',
      publisher: { '@type': 'Organization', name: SITE_NAME, url: baseUrl },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is Spaxio Assistant?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Spaxio Assistant is an AI website assistant platform for businesses. Add one script to deploy a chat widget or full-page assistant. It learns from your website, answers customer questions using your content, captures and qualifies leads with AI, collects quote requests with configurable forms and pricing rules for estimates, and automates follow-up. Optional voice conversations on higher plans.',
          },
        },
        {
          '@type': 'Question',
          name: 'What can I deploy with Spaxio Assistant?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'You can deploy a chat widget embedded on your site, a full-page shareable link, or both. Choose the display mode in Assistant settings. The AI learns from your website and uploaded knowledge, answers questions, captures leads with AI qualification, collects quote requests with estimates, and triggers automations.',
          },
        },
        {
          '@type': 'Question',
          name: 'How do I get started with Spaxio Assistant?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Sign up for Spaxio Assistant, use AI Setup to paste your website URL so the AI extracts your business info, or add content manually. Go to Install, copy the script tag, and paste it before the closing body tag on your site. Choose widget, full-page, or both in Assistant settings. The AI answers questions, captures and qualifies leads, collects quote requests, and automates follow-up.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is AI customer support?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'AI customer support uses a chatbot or assistant to answer common questions from your website content, qualify leads with scores and priorities, and automate replies 24/7. Spaxio Assistant embeds an AI assistant that learns from your site, captures leads with AI qualification, collects quote requests, and suggests follow-up actions so your team responds faster.',
          },
        },
      ],
    },
  ];

  return (
    <html lang="en" className={plusJakarta.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <AnalyticsHooks />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('spaxio-theme');document.documentElement.classList.toggle('dark',t!=='light');}catch(e){document.documentElement.classList.add('dark');}})();`,
          }}
        />
        <NextIntlClientProvider messages={messages}>
          <SetLocaleAttr />
          <ThemeProvider>
            <div className="flex min-h-screen flex-col">
              <JsonLd id="spaxio-seo-schemas" data={jsonLdData} />
              <main className="flex-1">
                <TermsGate>{children}</TermsGate>
              </main>
            </div>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
