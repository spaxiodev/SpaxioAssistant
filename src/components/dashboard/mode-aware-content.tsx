'use client';

import { Fragment } from 'react';
import { usePathname } from '@/i18n/navigation';
import { useViewMode } from '@/contexts/view-mode-context';
import { SimpleModeRouter } from '@/components/dashboard/simple-mode-router';

type ModeAwareContentProps = {
  children: React.ReactNode;
};

/**
 * Renders the full dashboard content. In Developer Mode, shows the server-rendered
 * page (children). In Simple Mode, shows the corresponding Simple-mode page for the
 * current route, so the entire app experience changes.
 */
export function ModeAwareContent({ children }: ModeAwareContentProps) {
  const { mode } = useViewMode();
  const pathname = usePathname();

  // Use key so React unmounts/remounts when switching mode, avoiding hook count mismatch
  // between the developer (page children) and simple (SimpleModeRouter) trees.
  if (mode === 'developer') {
    return <Fragment key="developer-mode">{children}</Fragment>;
  }

  return <SimpleModeRouter key="simple-mode" pathname={pathname} />;
}
