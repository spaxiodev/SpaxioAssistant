'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  Bot,
  Users,
  MessageCircle,
  Inbox,
  Mic,
  BookOpen,
  Workflow,
  BarChart3,
  Plug,
  Code,
  CreditCard,
  ChevronDown,
  User,
  Settings,
  LogOut,
  UserPlus,
  FileText,
  Webhook,
  Zap,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { CheckoutButton } from '@/app/dashboard/billing/checkout-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { UserDisplay } from '@/types/dashboard';

export type SubmenuItem = { nameKey: string; href: string };

const Menu = ({
  children,
  items,
  labelKey,
  icon: Icon,
  defaultOpen,
}: {
  children?: React.ReactNode;
  items: SubmenuItem[];
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
}) => {
  const pathname = usePathname();
  const isActiveSection = items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  );
  const [isOpened, setIsOpened] = useState(defaultOpen ?? isActiveSection);
  const t = useTranslations('dashboard');

  const submenuId = `submenu-${labelKey}`;
  return (
    <div>
      <button
        type="button"
        className={cn(
          'w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
          'text-muted-foreground hover:bg-white/50 hover:text-foreground dark:hover:bg-white/5'
        )}
        onClick={() => setIsOpened((v) => !v)}
        aria-expanded={isOpened}
        aria-controls={submenuId}
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />}
          {children ?? t(labelKey)}
        </div>
        <ChevronDown
          className={cn('h-5 w-5 shrink-0 duration-150', isOpened && 'rotate-180')}
          aria-hidden
        />
      </button>
      {isOpened && (
        <ul id={submenuId} className="ml-4 border-l border-border/50 pl-3 text-sm font-medium" role="list">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2 py-2 transition-all duration-150',
                    isActive
                      ? 'bg-[linear-gradient(135deg,hsl(var(--primary))/0.20,rgba(14,165,233,0.16))] text-foreground'
                      : 'text-muted-foreground hover:bg-white/50 hover:text-foreground dark:hover:bg-white/5'
                  )}
                >
                  {t(item.nameKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

function NavSection({
  labelKey,
  children,
}: {
  labelKey: string;
  children: React.ReactNode;
}) {
  const t = useTranslations('dashboard');
  return (
    <div className="space-y-1">
      <p
        className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80"
        aria-hidden
      >
        {t(labelKey)}
      </p>
      {children}
    </div>
  );
}

type SidebarWithSubmenuProps = {
  organizationId?: string;
  showUpgradeButton?: boolean;
  userDisplay?: UserDisplay | null;
};

function getInitials(fullName: string | null, email: string | null): string {
  if (fullName && fullName.trim()) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return '?';
}

export function SidebarWithSubmenu({ organizationId, showUpgradeButton, userDisplay }: SidebarWithSubmenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const displayName = userDisplay?.fullName?.trim() || userDisplay?.email || t('account');
  const initials = getInitials(userDisplay?.fullName ?? null, userDisplay?.email ?? null);

  const workspaceNav = [
    { href: '/dashboard', key: 'overview', icon: LayoutDashboard },
    { href: '/dashboard/agents', key: 'agents', icon: Bot },
    { href: '/dashboard/automations', key: 'automations', icon: Workflow },
    { href: '/dashboard/actions', key: 'aiActions', icon: Zap },
    { href: '/dashboard/knowledge', key: 'knowledge', icon: BookOpen },
  ];

  const crmSubmenu: SubmenuItem[] = [
    { nameKey: 'leads', href: '/dashboard/leads' },
    { nameKey: 'contacts', href: '/dashboard/contacts' },
    { nameKey: 'companies', href: '/dashboard/companies' },
    { nameKey: 'deals', href: '/dashboard/deals' },
    { nameKey: 'tickets', href: '/dashboard/tickets' },
    { nameKey: 'quoteRequests', href: '/dashboard/quote-requests' },
  ];

  const activityNav = [
    { href: '/dashboard/inbox', key: 'inbox', icon: Inbox },
    { href: '/dashboard/voice', key: 'voice', icon: Mic },
    { href: '/dashboard/conversations', key: 'conversations', icon: MessageCircle },
    { href: '/dashboard/bookings', key: 'bookings', icon: Calendar },
    { href: '/dashboard/documents', key: 'documents', icon: FileText },
    { href: '/dashboard/analytics', key: 'analytics', icon: BarChart3 },
  ];

  const developersNav = [
    { href: '/dashboard/deployments', key: 'deployments', icon: Code },
    { href: '/dashboard/webhooks', key: 'webhooks', icon: Webhook },
    { href: '/dashboard/integrations', key: 'integrations', icon: Plug },
  ];

  const setupSubmenu: SubmenuItem[] = [
    { nameKey: 'install', href: '/dashboard/install' },
    { nameKey: 'settingsTitle', href: '/dashboard/settings' },
  ];

  return (
    <aside className="fixed left-0 top-0 z-10 flex h-screen w-56 flex-col border-r border-white/30 bg-card/75 shadow-[12px_0_40px_-28px_rgba(91,33,182,0.5)] backdrop-blur dark:border-white/10">
      <Link
        href="/dashboard"
        className="flex h-16 items-center gap-3 px-4 font-semibold text-foreground shadow-[0_1px_0_0_hsl(var(--border)/0.22)]"
      >
        <img src="/icon.png" alt="" className="h-8 w-8 shrink-0 object-contain" aria-hidden />
        <span className="truncate">{tCommon('appName')}</span>
      </Link>
      {userDisplay && (
        <div className="shrink-0 border-b border-border/50 px-2 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all',
                  'text-foreground hover:bg-white/50 dark:hover:bg-white/5'
                )}
                aria-label={tCommon('accountMenu')}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/20 text-sm font-semibold text-primary">
                  {userDisplay.avatarUrl ? (
                    <img src={userDisplay.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span aria-hidden>{initials}</span>
                  )}
                </div>
                <span className="min-w-0 flex-1 truncate">{displayName}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" className="w-56 shadow-lg">
              <DropdownMenuItem asChild>
                <Link href="/dashboard/account" className="flex cursor-pointer items-center gap-2">
                  <User className="h-4 w-4" />
                  {t('account')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="flex cursor-pointer items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {t('settingsTitle')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/account/add" className="flex cursor-pointer items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  {t('addAccount')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex cursor-pointer items-center gap-2 text-muted-foreground focus:text-destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  handleSignOut();
                }}
              >
                <LogOut className="h-4 w-4" />
                {tCommon('signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <nav className="flex flex-1 flex-col overflow-auto p-3" aria-label={t('navAriaLabel')}>
        <div className="flex flex-1 flex-col gap-6">
          <NavSection labelKey="navSectionWorkspace">
            {workspaceNav.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
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
          </NavSection>

          <NavSection labelKey="navSectionCrm">
            <Menu items={crmSubmenu} labelKey="crm" icon={Users} />
          </NavSection>

          <NavSection labelKey="navSectionActivity">
            {activityNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
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
          </NavSection>

          <NavSection labelKey="navSectionDevelopers">
            {developersNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
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
          </NavSection>

          <NavSection labelKey="navSectionAccount">
            <Link
              href="/dashboard/billing"
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                pathname === '/dashboard/billing' || pathname.startsWith('/dashboard/billing/')
                  ? 'bg-[linear-gradient(135deg,hsl(var(--primary))/0.20,rgba(14,165,233,0.16))] text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.16)]'
                  : 'text-muted-foreground hover:bg-white/50 hover:text-foreground dark:hover:bg-white/5'
              )}
            >
              <CreditCard className={cn('h-5 w-5 shrink-0', pathname.startsWith('/dashboard/billing') && 'text-primary')} />
              {t('billingTitle')}
            </Link>
            <Menu items={setupSubmenu} labelKey="installAndSettings" icon={Settings} />
          </NavSection>

          {showUpgradeButton && organizationId && (
            <div className="pt-2">
              <CheckoutButton
                organizationId={organizationId}
                subscribeLabel={t('upgrade')}
                redirectingLabel={t('redirecting')}
                className="w-full rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:opacity-95 hover:shadow-xl"
              />
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
