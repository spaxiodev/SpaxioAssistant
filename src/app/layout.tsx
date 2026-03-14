import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { SetLocaleAttr } from '@/components/set-locale-attr';
import { ThemeProvider } from '@/components/theme-provider';
import { TermsGate } from '@/components/terms-gate';
import { JsonLd } from '@/components/seo/json-ld';
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_TITLE_TEMPLATE,
  DEFAULT_META_DESCRIPTION,
} from '@/lib/seo';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: DEFAULT_TITLE_TEMPLATE,
  },
  description: DEFAULT_META_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: DEFAULT_META_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: DEFAULT_META_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: { url: '/icon.png', type: 'image/png' },
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
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
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
                id="spaxio-organization-software-website"
                data={[
                  {
                    '@context': 'https://schema.org',
                    '@type': 'Organization',
                    name: SITE_NAME,
                    url: SITE_URL,
                    logo: `${SITE_URL}/icon.png`,
                    description: DEFAULT_META_DESCRIPTION,
                  },
                  {
                    '@context': 'https://schema.org',
                    '@type': 'SoftwareApplication',
                    name: SITE_NAME,
                    applicationCategory: 'BusinessApplication',
                    operatingSystem: 'Web',
                    url: SITE_URL,
                    description: DEFAULT_META_DESCRIPTION,
                  },
                  {
                    '@context': 'https://schema.org',
                    '@type': 'WebSite',
                    name: SITE_NAME,
                    url: SITE_URL,
                    description: DEFAULT_META_DESCRIPTION,
                    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
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
