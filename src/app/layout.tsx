import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { SetLocaleAttr } from '@/components/set-locale-attr';
import { ThemeProvider } from '@/components/theme-provider';
import { TermsGate } from '@/components/terms-gate';
import { JsonLd } from '@/components/seo/json-ld';

const SITE_URL = 'https://www.spaxioassistant.com';
const SITE_NAME = 'Spaxio Assistant';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'Spaxio Assistant is a premium AI chatbot for your website that learns from your content, answers questions instantly, and turns visitors into qualified leads.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description:
      'Create a custom AI chatbot for your website, train it on your content, and embed it with a single line of code.',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description:
      'Custom AI chatbot for your website that captures leads and automates customer support.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();
  return (
    <html lang="en" className={plusJakarta.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-black font-sans antialiased text-slate-100">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('spaxio-theme');document.documentElement.classList.toggle('dark',t!=='light');})();`,
          }}
        />
        <NextIntlClientProvider messages={messages}>
          <SetLocaleAttr />
          <ThemeProvider>
            <div className="flex min-h-screen flex-col">
              <JsonLd
                id="spaxio-organization-and-software"
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
                    description:
                      'Custom AI chatbot widget for websites that learns from your content and captures leads.',
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
