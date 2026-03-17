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
import { SITE_URL, SITE_NAME, DEFAULT_SEO, DEFAULT_OPEN_GRAPH, DEFAULT_TWITTER } from './seo';

const GOOGLE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
    images: DEFAULT_OPEN_GRAPH.images,
  },
  twitter: DEFAULT_TWITTER,
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: { url: '/icon.png', type: 'image/png' },
  },
  ...(GOOGLE_VERIFICATION ? { verification: { google: GOOGLE_VERIFICATION } } : {}),
};

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
              <JsonLd
                id="spaxio-seo-schemas"
                data={[
                  {
                    '@context': 'https://schema.org',
                    '@type': 'Organization',
                    name: SITE_NAME,
                    url: SITE_URL,
                    logo: `${SITE_URL}/icon.png`,
                  },
                  {
                    '@context': 'https://schema.org',
                    '@type': 'SoftwareApplication',
                    name: SITE_NAME,
                    applicationCategory: 'BusinessApplication',
                    operatingSystem: 'Web',
                    url: SITE_URL,
                    description: 'AI assistant platform for business. Deploy chat widgets or full-page AI experiences for quotes, support, and intake; capture leads and automate follow-up.',
                    featureList: [
                      'Chat widget and full-page AI experiences',
                      'Quote and support assistant pages',
                      'Lead capture and automation',
                      'AI trained on your content',
                      'CRM and workflow integration',
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
                    url: SITE_URL,
                    description: 'AI assistant platform for modern businesses: widget, full-page experiences, and automation.',
                    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
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
                          text: 'Spaxio Assistant is an AI assistant platform for business. You can deploy a chat widget on your website, launch full-page AI experiences for quotes or support, capture leads, and automate follow-up. One platform, multiple ways to connect with customers.',
                        },
                      },
                      {
                        '@type': 'Question',
                        name: 'What can I deploy with Spaxio Assistant?',
                        acceptedAnswer: {
                          '@type': 'Answer',
                          text: 'You can deploy a chat widget on your site, dedicated full-page AI experiences (e.g. Quote Assistant, Support Assistant, Intake), or both. The AI learns from your content and integrates with your CRM and workflows.',
                        },
                      },
                      {
                        '@type': 'Question',
                        name: 'How do I get started with Spaxio Assistant?',
                        acceptedAnswer: {
                          '@type': 'Answer',
                          text: 'Sign up for Spaxio Assistant, add your business details and content, then choose how to deploy: embed a chat widget with one script tag, publish a full-page AI experience (quote, support, intake), or both. The AI answers questions, captures leads, and automates support.',
                        },
                      },
                      {
                        '@type': 'Question',
                        name: 'What is AI customer support?',
                        acceptedAnswer: {
                          '@type': 'Answer',
                          text: 'AI customer support uses a chatbot or assistant to answer common questions, qualify leads, and automate replies 24/7. Spaxio Assistant provides an AI support chatbot you can embed on your website so visitors get instant answers and your team gets qualified leads.',
                        },
                      },
                    ],
                  },
                ]}
              />
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
