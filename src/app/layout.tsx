import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { SetLocaleAttr } from '@/components/set-locale-attr';
import { ThemeProvider } from '@/components/theme-provider';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Spaxio Assistant',
  description:
    'Create vibrant AI chat widgets for your website and turn conversations into leads and quote requests.',
  // Favicon/apple icon from file-based convention (app/icon.png) to avoid preload warning
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();
  return (
    <html lang="en" className={plusJakarta.variable} suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('spaxio-theme');document.documentElement.classList.toggle('dark',t!=='light');})();`,
          }}
        />
        <NextIntlClientProvider messages={messages}>
          <SetLocaleAttr />
          <ThemeProvider>
            <div className="flex min-h-screen flex-col">
              <main className="flex-1">{children}</main>
            </div>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
