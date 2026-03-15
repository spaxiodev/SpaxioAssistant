'use client';

import { SidebarWithSubmenu } from '@/components/ui/sidebar-with-submenu';
import type { UserDisplay } from '@/types/dashboard';

type SidebarProps = {
  organizationId?: string;
  userDisplay?: UserDisplay | null;
};

export function Sidebar({ organizationId, userDisplay }: SidebarProps) {
  return (
    <SidebarWithSubmenu
      organizationId={organizationId}
      userDisplay={userDisplay}
    />
  );
}
