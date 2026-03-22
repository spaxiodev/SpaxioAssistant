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
import { useViewMode } from '@/contexts/view-mode-context';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SearchTrigger } from '@/components/command-palette';
import { Search } from 'lucide-react';

type HeaderProps = {
  organizationId?: string;
  showUpgradeButton?: boolean;
};

export function Header({ showUpgradeButton }: HeaderProps) {
  const router = useRouter();
  const t = useTranslations('common');
  const { toggle } = useDashboardSidebar();
  const { mode, setMode } = useViewMode();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-white/30 bg-background px-4 dark:border-white/10 md:px-6">
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 md:hidden"
          onClick={toggle}
          aria-label={t('menu')}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          {showUpgradeButton && (
            <Button variant="default" size="sm" className="shrink-0 rounded-lg" asChild>
              <Link href="/pricing">{t('upgrade')}</Link>
            </Button>
          )}
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-background/70 px-2 py-1 text-xs text-muted-foreground sm:gap-2 sm:px-3">
            <button
              type="button"
              className={`transition-colors ${mode === 'simple' ? 'font-semibold text-foreground' : ''}`}
              onClick={() => setMode('simple')}
            >
              Simple
            </button>
            <Switch
              checked={mode === 'developer'}
              onCheckedChange={(checked) => setMode(checked ? 'developer' : 'simple')}
              aria-label="Toggle advanced Developer Mode"
            />
            <button
              type="button"
              className={`transition-colors ${mode === 'developer' ? 'font-semibold text-foreground' : ''}`}
              onClick={() => setMode('developer')}
            >
              <span className="sm:hidden">Dev</span>
              <span className="hidden sm:inline">Developer (Advanced)</span>
            </button>
          </div>
        </div>
      </div>
      <div className="hidden min-w-0 flex-1 px-2 md:flex md:items-center">
        <SearchTrigger className="min-w-0 w-full justify-start" />
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
