'use client';

import { usePathname } from 'next/navigation';

export function FooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Do not show the app footer (Contact, About, Pricing, © Spaxio) inside the client's widget iframe.
  if (pathname?.includes('widget-preview')) return null;
  if (pathname?.includes('/widget')) return null;
  return <>{children}</>;
}
