'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddBusinessDialog({ open, onOpenChange }: Props) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [canCreate, setCanCreate] = useState<boolean | null>(null);
  const [max, setMax] = useState(1);
  const [ownedCount, setOwnedCount] = useState(0);
  const [businessName, setBusinessName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setBusinessName('');
    fetch('/api/organization/can-create')
      .then((res) => res.json())
      .then((data) => {
        setCanCreate(data.can_create === true);
        setMax(data.max ?? 1);
        setOwnedCount(data.owned_count ?? 0);
      })
      .catch(() => setCanCreate(false));
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/organization/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: businessName.trim() || undefined,
          business_name: businessName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || t('addBusinessError'));
        return;
      }
      onOpenChange(false);
      router.refresh();
    } catch {
      setError(t('addBusinessError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose>
        <DialogHeader>
          <DialogTitle>{t('addBusiness')}</DialogTitle>
          <DialogDescription>{t('addBusinessDescription')}</DialogDescription>
        </DialogHeader>
        {canCreate === null ? (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        ) : !canCreate ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {t('addBusinessLimitReached', { max, count: ownedCount })}
            </p>
            <Button asChild>
              <a href="/dashboard/billing">{t('billingTitle')}</a>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-business-name">{t('addBusinessNameLabel')}</Label>
              <Input
                id="add-business-name"
                placeholder={t('addBusinessNamePlaceholder')}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                maxLength={120}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t('addBusinessCreating') : t('addBusinessCreate')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
