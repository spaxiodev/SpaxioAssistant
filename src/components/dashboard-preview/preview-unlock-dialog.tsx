'use client';

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Link } from '@/components/intl-link';

type PreviewUnlockDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string;
};

export function PreviewUnlockDialog({ open, onOpenChange, featureName }: PreviewUnlockDialogProps) {
  const title = useMemo(() => {
    if (!featureName) return 'Unlock this feature';
    return `Unlock ${featureName}`;
  }, [featureName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Preview Mode — Create an account to unlock this feature and launch your AI assistant.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button asChild className="sm:order-2">
            <Link href="/signup">Create free account</Link>
          </Button>
          <Button asChild variant="outline" className="sm:order-1">
            <Link href="/login">Log in</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

