'use client';

import { usePathname } from 'next/navigation';

export function FooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.includes('widget-preview')) return null;
  return <>{children}</>;
}
