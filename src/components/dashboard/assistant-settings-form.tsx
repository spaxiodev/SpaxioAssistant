'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

export function AssistantSettingsForm() {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState('Hi! How can I help you today?');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/assistant/settings')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (typeof data.welcomeMessage === 'string') setWelcomeMessage(data.welcomeMessage);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/assistant/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          welcomeMessage: welcomeMessage.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to save');
      }
      toast({ title: t('saved'), description: 'Assistant settings saved.' });
      router.refresh();
    } catch (err) {
      toast({
        title: t('error'),
        description: err instanceof Error ? err.message : 'Failed to save',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{t('behavior')}</CardTitle>
          <CardDescription>{t('behaviorDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Welcome message */}
          <div className="space-y-2">
            <Label htmlFor="welcome-message">{t('welcomeMessage')}</Label>
            <Textarea
              id="welcome-message"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Hi! How can I help you today?"
              className="min-h-[80px] resize-y"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              Shown when visitors open the chat.
            </p>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              t('save')
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
