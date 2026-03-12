'use client';

import {
  LayoutDashboard,
  Bot,
  Users,
  FileText,
  MessageSquare,
  Settings,
  CreditCard,
  Code,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

const nav = [
  { href: '/dashboard', key: 'overview', icon: LayoutDashboard },
  { href: '/dashboard/assistant', key: 'assistant', icon: Bot },
  { href: '/dashboard/leads', key: 'leads', icon: Users },
  { href: '/dashboard/quote-requests', key: 'quoteRequests', icon: FileText },
  { href: '/dashboard/conversations', key: 'conversations', icon: MessageSquare },
  { href: '/dashboard/settings', key: 'settingsTitle', icon: Settings },
  { href: '/dashboard/billing', key: 'billingTitle', icon: CreditCard },
  { href: '/dashboard/install', key: 'install', icon: Code },
];

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');

  return (
    <aside className="fixed left-0 top-0 z-10 flex h-screen w-56 flex-col border-r border-white/30 bg-card/75 shadow-[12px_0_40px_-28px_rgba(91,33,182,0.5)] backdrop-blur dark:border-white/10">
      <Link href="/dashboard" className="flex h-16 items-center gap-3 px-4 font-semibold text-foreground shadow-[0_1px_0_0_hsl(var(--border)/0.22)]">
        <img src="/icon.png" alt="" className="h-8 w-8 shrink-0 object-contain" aria-hidden />
        <span className="truncate">{tCommon('appName')}</span>
      </Link>
      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-[linear-gradient(135deg,hsl(var(--primary))/0.20,rgba(14,165,233,0.16))] text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.16)]'
                  : 'text-muted-foreground hover:bg-white/50 hover:text-foreground dark:hover:bg-white/5'
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
