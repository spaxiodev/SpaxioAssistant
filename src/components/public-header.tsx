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
    { href: '/', label: t('home'), primary: true },
    { href: '/pricing', label: t('pricing'), primary: false },
    { href: '/help', label: t('help'), primary: false },
    { href: '/contact', label: t('contact'), primary: false },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {navLinks.map(({ href, label, primary }) => (
            <Link
              key={href}
              href={href}
              className={primary ? 'font-medium text-foreground hover:text-muted-foreground' : 'text-muted-foreground hover:text-foreground'}
            >
              {label}
            </Link>
          ))}
        </nav>
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label={t('menu')}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 sm:gap-3">
          <LocaleSwitcher />
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden shrink-0 sm:inline-flex">
            <Link href="/login">{t('logIn')}</Link>
          </Button>
          <Button asChild size="sm" className="shrink-0 rounded-full px-4">
            <Link href="/signup">{t('getStarted')}</Link>
          </Button>
        </div>
      </div>
      {/* Mobile menu sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72">
          <nav className="mt-8 flex flex-col gap-1">
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
                  {t('logIn')}
                </Button>
              </Link>
              <Link href="/signup" onClick={() => setMobileOpen(false)}>
                <Button className="mt-2 w-full justify-start">
                  {t('getStarted')}
                </Button>
              </Link>
            </div>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
