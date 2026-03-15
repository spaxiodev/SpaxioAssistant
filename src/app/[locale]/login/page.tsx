'use client';

import { Suspense } from 'react';
import { SignInMobileGate } from '@/components/sign-in-mobile-gate';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-white/70 text-sm">Loading…</div>
        </div>
      }
    >
      <SignInMobileGate />
    </Suspense>
  );
}
