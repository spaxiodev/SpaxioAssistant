'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useTranslations } from 'next-intl';

type ProfileFormProps = {
  initial: {
    fullName: string | null;
    avatarUrl: string | null;
    email: string | null;
  };
};

export function ProfileForm({ initial }: ProfileFormProps) {
  const { toast } = useToast();
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [fullName, setFullName] = useState(initial.fullName ?? '');
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl ?? '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: t('error'), description: data?.error ?? 'Failed to save', variant: 'destructive' });
        return;
      }
      toast({ title: t('saved'), description: t('settingsUpdated') });
      window.location.reload(); // refresh layout/sidebar
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = useCallback(
    async (file: File) => {
      setAvatarLoading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/profile/avatar', { method: 'POST', body: formData });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast({ title: t('error'), description: data?.error ?? 'Upload failed', variant: 'destructive' });
          return;
        }
        if (data?.url) setAvatarUrl(data.url);
        toast({ title: t('saved'), description: 'Profile picture updated.' });
        window.location.reload();
      } finally {
        setAvatarLoading(false);
      }
    },
    [toast, t]
  );

  const initials = fullName?.trim()
    ? fullName.trim().split(/\s+/).length >= 2
      ? (fullName.trim().split(/\s+/)[0][0] + fullName.trim().split(/\s+/).pop()![0]).toUpperCase()
      : fullName.trim().slice(0, 2).toUpperCase()
    : (initial.email ?? '?').slice(0, 2).toUpperCase();

  return (
    <Card className="overflow-hidden border border-border-soft shadow-sm">
      <CardHeader className="border-b border-border-soft bg-muted/30 pb-6">
        <CardTitle className="text-xl">{t('account')}</CardTitle>
        <CardDescription className="mt-1.5">
          Your profile is shown in the sidebar. This info is only for your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-2">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted text-2xl font-semibold text-muted-foreground">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="sr-only"
              aria-hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(file);
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={avatarLoading}
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarLoading ? tCommon('loading') : (avatarUrl ? 'Change photo' : 'Add photo')}
            </Button>
          </div>
          <form onSubmit={handleProfileSubmit} className="min-w-0 flex-1 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account-full-name">{t('accountFullName')}</Label>
              <Input
                id="account-full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-email">{tCommon('email')}</Label>
              <Input
                id="account-email"
                type="email"
                value={initial.email ?? ''}
                disabled
                className="rounded-lg bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
            </div>
            <Button type="submit" disabled={loading} className="rounded-lg">
              {loading ? tCommon('loading') : 'Save profile'}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
