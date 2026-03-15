'use client';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Link } from '@/components/intl-link';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { LocaleSwitcher } from '@/components/locale-switcher';

type HeaderProps = {
  organizationId?: string;
  showUpgradeButton?: boolean;
};

export function Header({ showUpgradeButton }: HeaderProps) {
  const router = useRouter();
  const t = useTranslations('common');

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-white/30 bg-background/65 px-6 backdrop-blur dark:border-white/10">
      <div className="flex items-center gap-2">
        {showUpgradeButton && (
          <Button variant="default" size="sm" className="rounded-lg" asChild>
            <Link href="/pricing">{t('upgrade')}</Link>
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
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
    </header>
  );
}
