'use client';

import { Link } from '@/components/intl-link';
import { usePathname } from '@/i18n/navigation';
import { useLocale } from 'next-intl';

export function LocaleSwitcher() {
  const pathname = usePathname();
  const locale = useLocale();

  return (
    <span className="flex rounded-lg border border-border bg-muted/30 px-2 py-1 text-xs font-medium text-muted-foreground">
      <Link
        href={pathname}
        locale="en"
        className={locale === 'en' ? 'text-foreground' : 'hover:text-foreground'}
      >
        EN
      </Link>
      <span className="mx-1.5">|</span>
      <Link
        href={pathname}
        locale="fr-CA"
        className={locale === 'fr-CA' ? 'text-foreground' : 'hover:text-foreground'}
      >
        FR
      </Link>
    </span>
  );
}
