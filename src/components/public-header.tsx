'use client';

import { Link } from '@/components/intl-link';
import { useTranslations } from 'next-intl';
import { ThemeToggle } from '@/components/theme-toggle';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Button } from '@/components/ui/button';

export function PublicHeader() {
  const t = useTranslations('common');

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/"
            className="font-medium text-foreground hover:text-muted-foreground"
          >
            {t('home')}
          </Link>
          <Link
            href="/pricing"
            className="text-muted-foreground hover:text-foreground"
          >
            {t('pricing')}
          </Link>
          <Link
            href="/help"
            className="text-muted-foreground hover:text-foreground"
          >
            {t('help')}
          </Link>
          <Link
            href="/contact"
            className="text-muted-foreground hover:text-foreground"
          >
            {t('contact')}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
