'use client';

import { useViewMode } from '@/contexts/view-mode-context';

type ViewModeClientGateProps = {
  simple: React.ReactNode;
  developer: React.ReactNode;
};

export function ViewModeClientGate({ simple, developer }: ViewModeClientGateProps) {
  const { mode } = useViewMode();
  return <>{mode === 'simple' ? simple : developer}</>;
}

