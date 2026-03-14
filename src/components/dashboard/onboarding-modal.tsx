'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';

type OnboardingModalProps = {
  open: boolean;
  onSkip?: () => void;
  onComplete?: () => void;
};

export function OnboardingModal({ open, onSkip, onComplete }: OnboardingModalProps) {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim() || null,
          businessName: businessName.trim() || null,
          industry: industry.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('[onboarding]', data?.error);
        return;
      }
      onComplete?.();
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open}>
      <DialogContent showClose={!!onSkip} onInteractOutside={undefined} onEscapeKeyDown={onSkip} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('onboardingTitle')}</DialogTitle>
          <DialogDescription>{t('onboardingDescription')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="onboarding-full-name">{t('accountFullName')}</Label>
            <Input
              id="onboarding-full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="rounded-lg"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="onboarding-business-name">{t('onboardingBusinessName')}</Label>
            <Input
              id="onboarding-business-name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Acme Inc."
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="onboarding-industry">{t('onboardingIndustry')}</Label>
            <Input
              id="onboarding-industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Landscaping, Consulting"
              className="rounded-lg"
            />
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between pt-4">
            {onSkip && (
              <Button type="button" variant="ghost" onClick={onSkip} className="order-2 sm:order-1">
                {t('onboardingSkip')}
              </Button>
            )}
            <Button type="submit" disabled={loading} className="order-1 sm:order-2 rounded-lg">
              {loading ? tCommon('loading') : t('onboardingSubmit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
