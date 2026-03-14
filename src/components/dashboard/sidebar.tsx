'use client';

import { SidebarWithSubmenu } from '@/components/ui/sidebar-with-submenu';
import type { UserDisplay } from '@/types/dashboard';

type SidebarProps = {
  organizationId?: string;
  showUpgradeButton?: boolean;
  userDisplay?: UserDisplay | null;
};

export function Sidebar({ organizationId, showUpgradeButton, userDisplay }: SidebarProps) {
  return (
    <SidebarWithSubmenu
      organizationId={organizationId}
      showUpgradeButton={showUpgradeButton}
      userDisplay={userDisplay}
    />
  );
}
