'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

// Static copy so this boundary never depends on next-intl (avoids double-throw when
// the error happens before or outside NextIntlClientProvider, e.g. production mobile).
const FALLBACK = {
  title: 'Something went wrong',
  description: 'An error occurred. You can try again.',
  tryAgain: 'Try again',
} as const;

const isDev = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetail, setShowDetail] = useState(isDev);

  useEffect(() => {
    console.error('[Error boundary]', error?.message, error?.digest);
    if (typeof window !== 'undefined' && window.location?.search?.includes('showError=1')) {
      setShowDetail(true);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold text-foreground">{FALLBACK.title}</h1>
      <p className="text-center text-muted-foreground">{FALLBACK.description}</p>
      {showDetail && error?.message && (
        <pre className="max-h-40 max-w-full overflow-auto rounded border border-border bg-muted p-3 text-left text-xs text-foreground">
          {error.message}
        </pre>
      )}
      <Button onClick={reset}>{FALLBACK.tryAgain}</Button>
    </div>
  );
}
