 'use client';

 import { useEffect, useState } from 'react';
 import { usePathname } from 'next/navigation';
 import { useTranslations } from 'next-intl';
 import { Link } from '@/components/intl-link';
 import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

 const STORAGE_KEY = 'spaxio-accepted-terms-v1';

 const LEGAL_PATH_SEGMENTS = ['privacy-policy', 'terms-and-conditions'];

 function isLegalOrWidgetPath(pathname: string | null) {
   if (!pathname) return false;
   if (pathname.includes('widget-preview')) return true;
   if (pathname.includes('/widget')) return true;
   return LEGAL_PATH_SEGMENTS.some((segment) => pathname.includes(`/${segment}`));
 }

 export function TermsGate({ children }: { children: React.ReactNode }) {
   const pathname = usePathname();
   const t = useTranslations('legal');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasAccepted, setHasAccepted] = useState<boolean>(false);

   useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session?.user));
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(Boolean(session?.user));
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
     try {
       const stored = window.localStorage.getItem(STORAGE_KEY);
       setHasAccepted(stored === 'true');
     } catch {
       setHasAccepted(false);
     }
   }, []);

   const handleAccept = () => {
     try {
       window.localStorage.setItem(STORAGE_KEY, 'true');
     } catch {
       // ignore write errors, still proceed
     }
     setHasAccepted(true);
   };

  const handleDecline = async () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore write errors
    }
    setHasAccepted(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign('/login');
  };

   const shouldBypassGate = isLegalOrWidgetPath(pathname);
  const shouldShowGate = !shouldBypassGate && isAuthenticated === true && hasAccepted === false;

   return (
     <>
       {children}
      {shouldShowGate && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur">
           <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-lg">
             <h2 className="text-xl font-semibold tracking-tight">
               {t('modalTitle')}
             </h2>
             <p className="mt-3 text-sm text-muted-foreground">
               {t('modalDescription')}
             </p>
             <div className="mt-4 space-y-2 text-sm text-muted-foreground">
               <p>
                 {t('modalLinksIntro')}{' '}
                 <Link
                   href="/privacy-policy"
                   className="underline underline-offset-2 hover:text-foreground"
                 >
                   {t('privacyPolicy')}
                 </Link>{' '}
                 {t('and')}{' '}
                 <Link
                   href="/terms-and-conditions"
                   className="underline underline-offset-2 hover:text-foreground"
                 >
                   {t('termsAndConditions')}
                 </Link>
                 .
               </p>
             </div>
             <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
               <Button variant="outline" asChild size="sm">
                 <Link href="/privacy-policy">{t('viewPrivacyPolicy')}</Link>
               </Button>
               <Button variant="outline" asChild size="sm">
                 <Link href="/terms-and-conditions">{t('viewTerms')}</Link>
               </Button>
              <Button variant="outline" onClick={handleDecline} size="sm">
                {t('decline')}
              </Button>
               <Button onClick={handleAccept} size="sm">
                 {t('accept')}
               </Button>
             </div>
           </div>
         </div>
       )}
     </>
   );
 }

