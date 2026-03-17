'use client';

import { usePathname } from 'next/navigation';
import { PublicHeader } from '@/components/public-header';

export function PublicHeaderGate() {
  const pathname = usePathname();
  if (pathname?.includes('/dashboard')) return null;
  if (pathname?.includes('/widget')) return null;
  if (pathname?.includes('widget-preview')) return null;
  if (pathname?.includes('/a/')) return null;
  return <PublicHeader />;
}
