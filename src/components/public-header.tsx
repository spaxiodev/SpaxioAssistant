'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Link } from '@/components/intl-link';
import { useTranslations } from 'next-intl';
import { ThemeToggle } from '@/components/theme-toggle';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export function PublicHeader() {
  const t = useTranslations('common');
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: '/#features', label: t('features') },
    { href: '/#how-it-works', label: t('howItWorksNav') },
    { href: '/setup-guide', label: t('setupGuide') },
    { href: '/pricing', label: t('pricing') },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label={t('menu')}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 text-foreground transition-opacity hover:opacity-90"
          >
            <img src="/icon.png" alt="" className="h-8 w-8 shrink-0 object-contain" aria-hidden />
            <span className="truncate font-semibold tracking-tight">{t('appName')}</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex" aria-label="Main">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden px-3 sm:inline-flex">
            <Link href="/login">{t('signIn')}</Link>
          </Button>
          <Button asChild size="sm" className="rounded-full px-4">
            <Link href="/signup">{t('getStarted')}</Link>
          </Button>
        </div>
      </div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-80">
          <nav className="mt-6 flex flex-col gap-1" aria-label="Mobile main">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg px-4 py-3 text-base font-medium text-foreground hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </Link>
            ))}
            <div className="mt-4 border-t border-border pt-4">
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="w-full justify-start">
                  {t('signIn')}
                </Button>
              </Link>
              <Link href="/signup" onClick={() => setMobileOpen(false)}>
                <Button className="mt-2 w-full justify-start">{t('getStarted')}</Button>
              </Link>
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
