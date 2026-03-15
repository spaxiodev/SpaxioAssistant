'use client';

import { DashboardSidebarProvider } from '@/contexts/dashboard-sidebar-context';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import type { UserDisplay } from '@/types/dashboard';

type DashboardShellProps = {
  organizationId?: string;
  userDisplay?: UserDisplay | null;
  showUpgradeButton?: boolean;
  children: React.ReactNode;
};

export function DashboardShell({
  organizationId,
  userDisplay,
  showUpgradeButton,
  children,
}: DashboardShellProps) {
  return (
    <DashboardSidebarProvider>
      <Sidebar organizationId={organizationId} userDisplay={userDisplay} />
      <div className="relative ml-0 flex min-h-screen flex-1 flex-col md:ml-56">
        <Header organizationId={organizationId} showUpgradeButton={showUpgradeButton} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </DashboardSidebarProvider>
  );
}
