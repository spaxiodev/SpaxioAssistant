'use client';

import { usePathname } from 'next/navigation';
import { HelpChat } from '@/components/help-chat';

export function HelpChatGate() {
  const pathname = usePathname();
  if (pathname?.includes('widget-preview')) return null;
  return <HelpChat />;
}
