'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

export function GuestBanner() {
  const pathname = usePathname();
  const t = useTranslations('common');
  const [isGuest, setIsGuest] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsGuest(!session?.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsGuest(!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const isAuthPage =
    pathname?.includes('/login') || pathname?.includes('/signup');
  const isDashboard = pathname?.includes('/dashboard');
  const isWidget = pathname?.includes('/widget') || pathname?.includes('widget-preview');
  const isAiPage = pathname?.includes('/a/');

  if (isGuest !== true || isAuthPage || isDashboard || isWidget || isAiPage) {
    return null;
  }

  return (
    <div className="border-b border-border bg-muted/50 px-4 py-2">
      <div className="mx-auto max-w-5xl text-center text-sm">
        <p className="text-muted-foreground">{t('signUpToSeeMore')}</p>
      </div>
    </div>
  );
}
