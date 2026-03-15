'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { SimpleSignIn } from '@/components/ui/sign-in-flow-simple';

const MOBILE_BREAKPOINT = 768;

const SignInPageFull = dynamic(
  () => import('@/components/ui/sign-in-flow-1').then((m) => ({ default: m.SignInPage })),
  { ssr: false, loading: () => <SimpleSignIn /> }
);

/**
 * Renders SimpleSignIn on mobile (no @react-three/fiber) and the full SignInPage on desktop.
 * Prevents ReactCurrentBatchConfig / duplicate React errors on mobile.
 */
export function SignInMobileGate({ className }: { className?: string }) {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // SSR and first paint: assume mobile so we never load the heavy sign-in on small screens
  if (isMobile === null || isMobile) {
    return <SimpleSignIn className={className} />;
  }

  return <SignInPageFull className={className} />;
}
