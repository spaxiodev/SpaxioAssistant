'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  Bot,
  Users,
  MessageCircle,
  BookOpen,
  Workflow,
  CreditCard,
  ChevronDown,
  User,
  Settings,
  LogOut,
  UserPlus,
  Sparkles,
  Lock,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from '@/components/intl-link';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useDashboardSidebar } from '@/contexts/dashboard-sidebar-context';
import { useViewMode } from '@/contexts/view-mode-context';
import type { UserDisplay } from '@/types/dashboard';
import type { SidebarPlanAccess } from '@/components/dashboard/sidebar';
import type { FeatureKey } from '@/lib/plan-config';

export type SubmenuItem = { nameKey: string; href: string; featureKey?: FeatureKey };

const Menu = ({
  children,
  items,
  labelKey,
  icon: Icon,
  defaultOpen,
  onNavClick,
}: {
  children?: React.ReactNode;
  items: SubmenuItem[];
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  onNavClick?: () => void;
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
                  onClick={onNavClick}
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
  userDisplay?: UserDisplay | null;
  planAccess?: SidebarPlanAccess | null;
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

type SidebarContentProps = SidebarWithSubmenuProps & {
  onNavClick?: () => void;
};

function SidebarContent({ userDisplay, planAccess, onNavClick }: SidebarContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const { mode, setMode } = useViewMode();
  const featureAccess = planAccess?.featureAccess ?? {};

  function isLocked(featureKey?: FeatureKey): boolean {
    if (!featureKey) return false;
    return !featureAccess[featureKey];
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const displayName = userDisplay?.fullName?.trim() || userDisplay?.email || t('account');
  const initials = getInitials(userDisplay?.fullName ?? null, userDisplay?.email ?? null);

  const coreNav = [
    { href: '/dashboard', key: 'overview', icon: LayoutDashboard },
    { href: '/dashboard/ai-setup', key: 'aiSetupAssistant', icon: Sparkles },
    { href: '/dashboard/agents', key: 'agents', icon: Bot },
    { href: '/dashboard/knowledge', key: 'knowledge', icon: BookOpen },
    { href: '/dashboard/install', key: 'install', icon: MessageCircle },
    { href: '/dashboard/conversations', key: 'conversations', icon: MessageCircle },
    { href: '/dashboard/leads', key: 'leads', icon: Users },
    { href: '/dashboard/quote-requests', key: 'quoteRequests', icon: Users },
    { href: '/dashboard/automations', key: 'automations', icon: Workflow, featureKey: 'automations' as FeatureKey },
    { href: '/dashboard/team', key: 'teamMembers', icon: UserPlus, featureKey: 'team_members' as FeatureKey },
  ];

  const settingsHref = '/dashboard/settings';

  const isSimpleMode = mode === 'simple';

  return (
    <>
      <Link
        href="/dashboard"
        onClick={onNavClick}
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
                <Link href="/dashboard/account" className="flex cursor-pointer items-center gap-2" onClick={onNavClick}>
                  <User className="h-4 w-4" />
                  {t('account')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="flex cursor-pointer items-center gap-2" onClick={onNavClick}>
                  <Settings className="h-4 w-4" />
                  {t('settingsTitle')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/team"
                  className="flex cursor-pointer items-center gap-2"
                  onClick={onNavClick}
                >
                  <UserPlus className="h-4 w-4" />
                  {t('teamMembers')}
                  {featureAccess.team_members === false && (
                    <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  )}
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
          {isSimpleMode ? (
            <>
              <NavSection labelKey="navSectionWorkspace">
                <Link
                  href="/dashboard"
                  onClick={onNavClick}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all',
                    pathname === '/dashboard'
                      ? 'bg-[linear-gradient(135deg,hsl(var(--primary))/0.18,rgba(14,165,233,0.16))] text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.18)]'
                      : 'text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-white/5'
                  )}
                >
                  <LayoutDashboard className="h-5 w-5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate">Home</span>
                </Link>
                <Link
                  href="/dashboard/ai-setup"
                  onClick={onNavClick}
                  className={cn(
                    'mt-2 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all',
                    pathname.startsWith('/dashboard/ai-setup')
                      ? 'bg-[linear-gradient(135deg,hsl(var(--primary))/0.18,rgba(14,165,233,0.16))] text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.18)]'
                      : 'text-sky-500 hover:bg-white/60 hover:text-sky-500 dark:hover:bg-white/5'
                  )}
                >
                  <Sparkles className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">AI Setup</span>
                </Link>
                <Link
                  href="/dashboard/conversations"
                  onClick={onNavClick}
                  className={cn(
                    'mt-2 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all',
                    pathname.startsWith('/dashboard/inbox') || pathname.startsWith('/dashboard/conversations')
                      ? 'bg-[linear-gradient(135deg,hsl(var(--primary))/0.18,rgba(14,165,233,0.16))] text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.18)]'
                      : 'text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-white/5'
                  )}
                >
                  <MessageCircle className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">Conversations</span>
                </Link>
                <Link
                  href="/dashboard/leads"
                  onClick={onNavClick}
                  className={cn(
                    'mt-2 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all',
                    pathname.startsWith('/dashboard/leads') ||
                      pathname.startsWith('/dashboard/contacts') ||
                      pathname.startsWith('/dashboard/quote-requests')
                      ? 'bg-[linear-gradient(135deg,hsl(var(--primary))/0.18,rgba(14,165,233,0.16))] text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.18)]'
                      : 'text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-white/5'
                  )}
                >
                  <Users className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">Leads</span>
                </Link>
                <Link
                  href="/dashboard/install"
                  onClick={onNavClick}
                  className={cn(
                    'mt-2 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all',
                    pathname.startsWith('/dashboard/install')
                      ? 'bg-[linear-gradient(135deg,hsl(var(--primary))/0.18,rgba(14,165,233,0.16))] text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.18)]'
                      : 'text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-white/5'
                  )}
                >
                  <MessageCircle className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">Install</span>
                </Link>
                <Link
                  href="/help"
                  onClick={onNavClick}
                  className={cn(
                    'mt-2 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all',
                    pathname === '/help'
                      ? 'bg-[linear-gradient(135deg,hsl(var(--primary))/0.18,rgba(14,165,233,0.16))] text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.18)]'
                      : 'text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-white/5'
                  )}
                >
                  <HelpCircle className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">Help</span>
                </Link>
              </NavSection>

              <NavSection labelKey="navSectionAccount">
                <Link
                  href="/dashboard/settings"
                  onClick={onNavClick}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all',
                    pathname.startsWith('/dashboard/settings')
                      ? 'bg-[linear-gradient(135deg,hsl(var(--primary))/0.18,rgba(14,165,233,0.16))] text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.18)]'
                      : 'text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-white/5'
                  )}
                >
                  <Settings className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">Settings</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMode('developer');
                    onNavClick?.();
                  }}
                  className="mt-3 flex items-center gap-3 rounded-2xl bg-muted/60 px-3 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <Lock className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">Switch to Developer Mode</span>
                </button>
              </NavSection>
            </>
          ) : (
            <>
              <NavSection labelKey="navSectionWorkspace">
                {coreNav.map((item) => {
                  const isActive =
                    pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  const isAiSetup = item.key === 'aiSetupAssistant';
                  const locked = isLocked(item.featureKey);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavClick}
                      style={!isActive && isAiSetup ? { color: '#0ea5e9' } : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-[linear-gradient(135deg,hsl(var(--primary))/0.20,rgba(14,165,233,0.16))] text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.16)]'
                          : isAiSetup
                            ? 'hover:bg-white/50 hover:opacity-90 dark:hover:bg-white/5'
                            : 'text-muted-foreground hover:bg-white/50 hover:text-foreground dark:hover:bg-white/5'
                      )}
                    >
                      <Icon
                        className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')}
                        style={!isActive && isAiSetup ? { color: '#0ea5e9' } : undefined}
                      />
                      <span className="min-w-0 flex-1 truncate">{t(item.key)}</span>
                      {locked && (
                        <Lock className="h-4 w-4 shrink-0 text-muted-foreground/80" aria-label="Upgrade required" />
                      )}
                    </Link>
                  );
                })}
              </NavSection>

              <NavSection labelKey="navSectionAccount">
                <Link
                  href="/dashboard/billing"
                  onClick={onNavClick}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                    pathname === '/dashboard/billing' || pathname.startsWith('/dashboard/billing/')
                      ? 'bg-[linear-gradient(135deg,hsl(var(--primary))/0.20,rgba(14,165,233,0.16))] text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.16)]'
                      : 'text-muted-foreground hover:bg-white/50 hover:text-foreground dark:hover:bg-white/5'
                  )}
                >
                  <CreditCard
                    className={cn('h-5 w-5 shrink-0', pathname.startsWith('/dashboard/billing') && 'text-primary')}
                  />
                  {t('billingTitle')}
                </Link>
                <Link
                  href={settingsHref}
                  onClick={onNavClick}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                    pathname === settingsHref || pathname.startsWith(settingsHref + '/')
                      ? 'bg-[linear-gradient(135deg,hsl(var(--primary))/0.20,rgba(14,165,233,0.16))] text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.16)]'
                      : 'text-muted-foreground hover:bg-white/50 hover:text-foreground dark:hover:bg-white/5'
                  )}
                >
                  <Settings
                    className={cn('h-5 w-5 shrink-0', pathname.startsWith(settingsHref) && 'text-primary')}
                  />
                  {t('settingsTitle')}
                </Link>
              </NavSection>
            </>
          )}
        </div>
      </nav>
    </>
  );
}

export function SidebarWithSubmenu({ organizationId, userDisplay, planAccess }: SidebarWithSubmenuProps) {
  const { open, setOpen } = useDashboardSidebar();

  const sidebarClass =
    'h-screen w-56 border-r border-white/30 bg-card/75 shadow-[12px_0_40px_-28px_rgba(91,33,182,0.5)] backdrop-blur dark:border-white/10';

  return (
    <>
      <aside
        className={cn('fixed left-0 top-0 z-10 hidden md:flex md:flex-col', sidebarClass)}
        aria-label="Main navigation"
      >
        <SidebarContent userDisplay={userDisplay} planAccess={planAccess} organizationId={organizationId} />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-56 max-w-[85vw] border-white/30 bg-card/75 shadow-[12px_0_40px_-28px_rgba(91,33,182,0.5)] backdrop-blur dark:border-white/10"
          showCloseButton={true}
        >
          <div className="flex h-full flex-col">
            <SidebarContent
              userDisplay={userDisplay}
              planAccess={planAccess}
              organizationId={organizationId}
              onNavClick={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
