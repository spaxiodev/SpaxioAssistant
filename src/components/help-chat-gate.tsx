'use client';

import { usePathname } from 'next/navigation';
import { HelpChat } from '@/components/help-chat';

export function HelpChatGate() {
  const pathname = usePathname();
  // Help chat is only for the Spaxio Assistant app. Hide it when the page is loaded inside the client's widget iframe (/en/widget, /fr/widget) or on widget-preview.
  if (pathname?.includes('widget-preview')) return null;
  if (pathname?.includes('/widget')) return null;
  return <HelpChat />;
}
