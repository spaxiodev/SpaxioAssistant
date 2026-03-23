'use client';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Link } from '@/components/intl-link';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Menu, MoreVertical } from 'lucide-react';
import { useDashboardSidebar } from '@/contexts/dashboard-sidebar-context';
import { DashboardModeSwitcher } from '@/components/dashboard/dashboard-mode-switcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SearchTrigger } from '@/components/command-palette';

type HeaderProps = {
  organizationId?: string;
  showUpgradeButton?: boolean;
};

export function Header({ showUpgradeButton }: HeaderProps) {
  const router = useRouter();
  const t = useTranslations('common');
  const { toggle } = useDashboardSidebar();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex min-h-14 flex-wrap items-center gap-2 border-b border-border/50 bg-background/95 px-3 py-2.5 backdrop-blur-md dark:border-white/10 md:flex-nowrap md:gap-3 md:px-5 md:py-3">
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 md:hidden"
          onClick={toggle}
          aria-label={t('menu')}
        >
          <Menu className="h-5 w-5" />
        </Button>
        {showUpgradeButton && (
          <Button variant="default" size="sm" className="shrink-0 rounded-lg" asChild>
            <Link href="/pricing">{t('upgrade')}</Link>
          </Button>
        )}
        <DashboardModeSwitcher />
      </div>
      <div className="hidden min-w-0 flex-1 px-1 md:flex md:max-w-xl md:justify-center lg:max-w-2xl">
        <SearchTrigger className="min-w-0 w-full max-w-xl justify-start" />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-2">
        <div className="hidden md:flex md:items-center md:gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/billing">{t('billing')}</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/pricing">{t('pricing')}</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/settings">{t('settings')}</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/help">{t('help')}</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">{t('home')}</Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            {t('signOut')}
          </Button>
        </div>
        <span className="md:hidden">
          <ThemeToggle />
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label={t('more')}>
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/billing" className="cursor-pointer">
                {t('billing')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/pricing" className="cursor-pointer">
                {t('pricing')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="cursor-pointer">
                {t('settings')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/help" className="cursor-pointer">
                {t('help')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/" className="cursor-pointer">
                {t('home')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 md:hidden">
              <LocaleSwitcher />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-muted-foreground focus:text-destructive"
              onSelect={(e) => {
                e.preventDefault();
                handleSignOut();
              }}
            >
              {t('signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
