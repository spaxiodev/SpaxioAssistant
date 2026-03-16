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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-2 border-b border-white/30 bg-background/65 px-4 backdrop-blur dark:border-white/10 md:px-6">
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
        {showUpgradeButton && (
          <Button variant="default" size="sm" className="shrink-0 rounded-lg" asChild>
            <Link href="/pricing">{t('upgrade')}</Link>
          </Button>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1 md:gap-2">
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
