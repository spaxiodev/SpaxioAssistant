'use client';

import { Suspense } from 'react';
import { SignInMobileGate } from '@/components/sign-in-mobile-gate';

export default function DemoSignInPage() {
  return (
    <div className="flex w-full min-h-screen justify-center items-center">
      <Suspense
        fallback={
          <div className="min-h-screen bg-black flex items-center justify-center w-full">
            <div className="text-white/70 text-sm">Loading…</div>
          </div>
        }
      >
        <SignInMobileGate className="w-full min-h-screen" />
      </Suspense>
    </div>
  );
}
