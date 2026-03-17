'use client';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Link } from '@/components/intl-link';
import { useTranslations } from 'next-intl';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Menu } from 'lucide-react';
import { useDashboardSidebar } from '@/contexts/dashboard-sidebar-context';

export function PreviewHeader() {
  const t = useTranslations('common');
  const { toggle } = useDashboardSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-white/30 bg-background px-4 dark:border-white/10 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 md:hidden"
          onClick={toggle}
          aria-label={t('menu')}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">Dashboard Preview</p>
          <p className="truncate text-xs text-muted-foreground">Explore the product with demo data</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1 md:gap-2">
        <div className="hidden md:flex md:items-center md:gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/pricing">{t('pricing')}</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">Create account</Link>
          </Button>
        </div>
        <span className="md:hidden">
          <ThemeToggle />
        </span>
      </div>
    </header>
  );
}

