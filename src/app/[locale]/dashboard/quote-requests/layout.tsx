'use client';

import { usePathname } from '@/i18n/navigation';
import { Link } from '@/components/intl-link';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/dashboard/quote-requests', key: 'quoteRequestsTabRequests' },
  { href: '/dashboard/quote-requests/form-setup', key: 'quoteRequestsTabFormSetup' },
  { href: '/dashboard/quote-requests/pricing', key: 'quoteRequestsTabPricingRules' },
] as const;

export default function QuoteRequestsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const t = useTranslations('dashboard');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 border-b border-border pb-2">
        {TABS.map((tab) => {
          const isActive =
            tab.href === pathname ||
            (tab.href !== '/dashboard/quote-requests' && pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              {t(tab.key)}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
