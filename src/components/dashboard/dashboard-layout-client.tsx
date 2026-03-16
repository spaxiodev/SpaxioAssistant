'use client';

import { DashboardSidebarProvider } from '@/contexts/dashboard-sidebar-context';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ViewModeProvider } from '@/contexts/view-mode-context';
import { ModeAwareContent } from '@/components/dashboard/mode-aware-content';
import type { UserDisplay } from '@/types/dashboard';
import type { SidebarPlanAccess } from '@/components/dashboard/sidebar';

type DashboardLayoutClientProps = {
  organizationId: string;
  userDisplay: UserDisplay;
  planAccess: SidebarPlanAccess | null;
  showUpgradeButton: boolean;
  children: React.ReactNode;
};

export function DashboardLayoutClient({
  organizationId,
  userDisplay,
  planAccess,
  showUpgradeButton,
  children,
}: DashboardLayoutClientProps) {
  return (
    <DashboardSidebarProvider>
      <ViewModeProvider>
        <div className="relative flex bg-transparent">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_24%)]" />
          <Sidebar organizationId={organizationId} userDisplay={userDisplay} planAccess={planAccess} />
          <div className="relative ml-0 flex min-h-screen flex-1 flex-col md:ml-56">
            <Header organizationId={organizationId} showUpgradeButton={showUpgradeButton} />
            <main className="flex-1 p-4 md:p-6">
            <ModeAwareContent>{children}</ModeAwareContent>
          </main>
          </div>
        </div>
      </ViewModeProvider>
    </DashboardSidebarProvider>
  );
}
