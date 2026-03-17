'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/components/intl-link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

const TEASER_PEEK_VH = 70;

function isTeaserRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  const p = pathname.toLowerCase();
  if (p.includes('/login') || p.includes('/signup')) return false;
  if (p.includes('/dashboard') || p.includes('/widget')) return false;
  if (p.includes('/a/')) return false;
  if (p.includes('widget-preview')) return false;
  if (p.includes('/privacy-policy') || p.includes('/terms-and-conditions')) return false;
  if (p.includes('/invite') || p.includes('/demo')) return false;
  return true;
}

export function GuestTeaserGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations('common');
  const tHome = useTranslations('home');
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

  const showOverlay = isGuest === true && isTeaserRoute(pathname);

  if (!showOverlay) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <div
        className="pointer-events-none fixed left-0 right-0 bottom-0 z-10 bg-background/40 backdrop-blur-md"
        style={{ top: `${TEASER_PEEK_VH}vh` }}
        aria-hidden
      />
      <div
        className="pointer-events-auto fixed left-0 right-0 z-10 flex flex-wrap items-center justify-center gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm"
        style={{ top: `${TEASER_PEEK_VH}vh` }}
      >
        <p className="text-center text-sm text-muted-foreground">
          {t('signUpToSeeFullSite')}
        </p>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="default">
            <Link href="/signup">{tHome('createAccount')}</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/login">{tHome('logIn')}</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
