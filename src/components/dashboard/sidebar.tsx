'use client';

import { SidebarWithSubmenu } from '@/components/ui/sidebar-with-submenu';
import type { UserDisplay } from '@/types/dashboard';

/** Plan access for nav (planName + featureAccess). Passed from server layout. */
export type SidebarPlanAccess = {
  planName: string;
  featureAccess: Record<string, boolean>;
};

type SidebarProps = {
  organizationId?: string;
  userDisplay?: UserDisplay | null;
  planAccess?: SidebarPlanAccess | null;
};

export function Sidebar({ organizationId, userDisplay, planAccess }: SidebarProps) {
  return (
    <SidebarWithSubmenu
      organizationId={organizationId}
      userDisplay={userDisplay}
      planAccess={planAccess}
    />
  );
}
