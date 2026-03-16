'use client';

import { Button } from '@/components/ui/button';
import { Link } from '@/components/intl-link';

export function PreviewBanner() {
  return (
    <div className="border-b border-white/30 bg-background/70 px-4 py-2 backdrop-blur dark:border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
        <div className="text-sm">
          <span className="font-medium text-foreground">Preview Mode</span>{' '}
          <span className="text-muted-foreground">— Create your free account to build and launch your AI assistant.</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="rounded-lg">
            <Link href="/signup">Create free account</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-lg">
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

