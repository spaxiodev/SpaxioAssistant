'use client';

import { cn } from '@/lib/utils';
import { Link } from '@/components/intl-link';
import { usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

const LINKS: { href: string; key: string }[] = [
  { href: '/dashboard/communications', key: 'communicationsNavOverview' },
  { href: '/dashboard/communications/sms', key: 'communicationsNavSms' },
  { href: '/dashboard/communications/calls', key: 'communicationsNavCalls' },
  { href: '/dashboard/communications/phone-numbers', key: 'communicationsNavPhoneNumbers' },
  { href: '/dashboard/communications/ai-flows', key: 'communicationsNavAiFlows' },
  { href: '/dashboard/communications/templates', key: 'communicationsNavTemplates' },
  { href: '/dashboard/communications/settings', key: 'communicationsNavSettings' },
  { href: '/dashboard/communications/history', key: 'communicationsNavHistory' },
];

export function CommunicationsSubnav() {
  const pathname = usePathname();
  const t = useTranslations('dashboard');

  return (
    <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto rounded-2xl border border-border/60 bg-muted/30 p-1 dark:bg-muted/20">
      {LINKS.map(({ href, key }) => {
        const active = pathname === href || (href !== '/dashboard/communications' && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition-all',
              active
                ? 'bg-[linear-gradient(135deg,hsl(var(--primary))/0.22,rgba(14,165,233,0.14))] text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2)]'
                : 'text-muted-foreground hover:bg-background/80 hover:text-foreground'
            )}
          >
            {t(key)}
          </Link>
        );
      })}
    </div>
  );
}
