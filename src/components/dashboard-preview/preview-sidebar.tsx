'use client';

import { useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Bot,
  Code,
  BookOpen,
  Inbox,
  BarChart3,
  Workflow,
  Users,
  CreditCard,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from '@/components/intl-link';
import { usePathname } from '@/i18n/navigation';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useDashboardSidebar } from '@/contexts/dashboard-sidebar-context';
import { DASHBOARD_PREVIEW_DATA } from '@/lib/dashboard-preview-data';

export type PreviewSection =
  | 'overview'
  | 'assistants'
  | 'widget'
  | 'knowledge'
  | 'inbox'
  | 'analytics'
  | 'automations'
  | 'team'
  | 'billing';

const sidebarClass =
  'h-screen w-56 border-r border-white/30 bg-card/75 shadow-[12px_0_40px_-28px_rgba(91,33,182,0.5)] backdrop-blur dark:border-white/10';

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  locked,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  locked?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
        active
          ? 'bg-[linear-gradient(135deg,hsl(var(--primary))/0.20,rgba(14,165,233,0.16))] text-foreground shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.16)]'
          : 'text-muted-foreground hover:bg-white/50 hover:text-foreground dark:hover:bg-white/5'
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', active && 'text-primary')} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {locked && <Lock className="h-4 w-4 shrink-0 text-muted-foreground/80" aria-hidden />}
    </Link>
  );
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();

  const currentSection = useMemo(() => {
    const parts = (pathname ?? '').split('/').filter(Boolean);
    const idx = parts.findIndex((p) => p === 'dashboard-preview');
    const section = idx >= 0 ? parts[idx + 1] : undefined;
    return (section as PreviewSection | undefined) ?? 'overview';
  }, [pathname]);

  const items: Array<{
    section: PreviewSection;
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    locked?: boolean;
  }> = [
    { section: 'overview', label: 'Overview', href: '/dashboard-preview/overview', icon: LayoutDashboard },
    { section: 'assistants', label: 'Assistants', href: '/dashboard-preview/assistants', icon: Bot, locked: true },
    { section: 'widget', label: 'Widget', href: '/dashboard-preview/widget', icon: Code, locked: true },
    { section: 'knowledge', label: 'Knowledge', href: '/dashboard-preview/knowledge', icon: BookOpen, locked: true },
    { section: 'inbox', label: 'Inbox', href: '/dashboard-preview/inbox', icon: Inbox, locked: true },
    { section: 'analytics', label: 'Analytics', href: '/dashboard-preview/analytics', icon: BarChart3, locked: true },
    { section: 'automations', label: 'Automations', href: '/dashboard-preview/automations', icon: Workflow, locked: true },
    { section: 'team', label: 'Team', href: '/dashboard-preview/team', icon: Users, locked: true },
    { section: 'billing', label: 'Billing', href: '/dashboard-preview/billing', icon: CreditCard, locked: true },
  ];

  return (
    <>
      <Link
        href="/dashboard-preview/overview"
        onClick={onNavClick}
        className="flex h-16 items-center gap-3 px-4 font-semibold text-foreground shadow-[0_1px_0_0_hsl(var(--border)/0.22)]"
      >
        <img src="/icon.png" alt="" className="h-8 w-8 shrink-0 object-contain" aria-hidden />
        <div className="min-w-0">
          <p className="truncate">Spaxio Assistant</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{DASHBOARD_PREVIEW_DATA.businessName}</p>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col overflow-auto p-3" aria-label="Dashboard preview navigation">
        <div className="flex flex-1 flex-col gap-2">
          {items.map((item) => (
            <NavLink
              key={item.section}
              href={item.href}
              label={item.label}
              icon={item.icon}
              locked={item.locked}
              active={currentSection === item.section}
              onClick={onNavClick}
            />
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-border/60 bg-background/60 p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview</p>
          <p className="mt-1 text-sm font-medium text-foreground">Create your assistant in minutes</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign up to connect your website, train knowledge, and launch the widget.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href="/login"
              className="rounded-lg border border-border bg-background px-3 py-2 text-center text-xs font-medium text-foreground hover:bg-muted"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-primary px-3 py-2 text-center text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}

export function PreviewSidebar() {
  const { open, setOpen } = useDashboardSidebar();

  return (
    <>
      <aside className={cn('fixed left-0 top-0 z-10 hidden md:flex md:flex-col', sidebarClass)} aria-label="Preview">
        <SidebarContent />
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className={cn('w-56 max-w-[85vw] border-white/30 bg-card/75 backdrop-blur dark:border-white/10', sidebarClass)}
          showCloseButton={true}
        >
          <div className="flex h-full flex-col">
            <SidebarContent onNavClick={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

