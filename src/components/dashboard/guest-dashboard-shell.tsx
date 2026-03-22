'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/components/intl-link';
import { ThemeToggle } from '@/components/theme-toggle';
import { SignInPromptModal } from '@/components/dashboard/sign-in-prompt-modal';
import { LocaleSwitcher } from '@/components/locale-switcher';

type GuestDashboardShellProps = {
  children: React.ReactNode;
};

export function GuestDashboardShell({ children }: GuestDashboardShellProps) {
  const t = useTranslations('common');
  const tHome = useTranslations('home');
  return (
    <div className="relative min-h-screen">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-2 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-foreground">
          <img src="/icon.png" alt="" className="h-8 w-8 shrink-0 object-contain" aria-hidden />
          <span>{t('appName')}</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            {tHome('logIn')}
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {tHome('getStarted')}
          </Link>
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <main className="relative flex-1">{children}</main>
      <SignInPromptModal />
    </div>
  );
}
