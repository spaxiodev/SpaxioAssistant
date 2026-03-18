'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/components/intl-link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const DISMISSED_KEY = 'sign-in-prompt-dismissed';

export function SignInPromptModal() {
  const t = useTranslations('login');
  const tHome = useTranslations('home');
  const tCommon = useTranslations('common');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissed = typeof window !== 'undefined' && sessionStorage.getItem(DISMISSED_KEY);
    setOpen(!dismissed);
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      sessionStorage.setItem(DISMISSED_KEY, 'true');
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showClose className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <Button asChild size="lg" className="w-full">
            <Link href="/signup">{tHome('getStarted')}</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full">
            <Link href="/login">{tHome('logIn')}</Link>
          </Button>
        </div>
        <DialogFooter className="text-center text-sm text-muted-foreground sm:justify-center">
          {tCommon('signUpToSeeMore')}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
