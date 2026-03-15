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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();
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
                    description: 'AI chatbot widget platform for websites. Deploy custom AI chat widgets that answer questions, capture leads, and automate customer support.',
                    featureList: [
                      'AI chatbot widget for website',
                      'AI website assistant',
                      'Lead capture and automation',
                      'AI support chatbot',
                      'Custom AI chatbot trained on your content',
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
                    description: 'AI chatbot widget and AI website assistant for modern businesses.',
                    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
                  },
                  {
                    '@context': 'https://schema.org',
                    '@type': 'FAQPage',
                    mainEntity: [
                      {
                        '@type': 'Question',
                        name: 'What is an AI chatbot widget?',
                        acceptedAnswer: {
                          '@type': 'Answer',
                          text: 'An AI chatbot widget is a small chat interface you add to your website so visitors can talk to an AI that answers questions, captures leads, and automates support. Spaxio Assistant lets you create a custom AI chatbot for your website and embed it with one line of code.',
                        },
                      },
                      {
                        '@type': 'Question',
                        name: 'What is the best AI widget for a website?',
                        acceptedAnswer: {
                          '@type': 'Answer',
                          text: 'The best AI widget for your website learns from your content, answers visitor questions instantly, captures leads, and fits your brand. Spaxio Assistant is an AI chatbot widget you can embed with one line of code; it trains on your site and integrates with your CRM and workflows.',
                        },
                      },
                      {
                        '@type': 'Question',
                        name: 'How do I add an AI chatbot to my website?',
                        acceptedAnswer: {
                          '@type': 'Answer',
                          text: 'Add an AI chatbot to your website by signing up for Spaxio Assistant, training it on your content, and pasting one script tag into your site. The AI chatbot widget appears on your pages and can answer questions, capture leads, and automate customer support.',
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
