'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { QuoteFormConfig } from '@/app/api/dashboard/quote-form-config/route';

export function QuoteFormSetupClient() {
  const t = useTranslations('dashboard');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<QuoteFormConfig>({
    intro_text: '',
    submit_button_label: 'Calculate and Submit',
    name_required: true,
    email_required: true,
    phone_required: false,
    show_estimate_instantly: true,
    show_exact_estimate: true,
  });

  useEffect(() => {
    fetch('/api/dashboard/quote-form-config')
      .then((r) => r.json())
      .then((d) => {
        if (d && typeof d === 'object') setConfig((c) => ({ ...c, ...d }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/dashboard/quote-form-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');
      setConfig(data);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('quoteFormSetupTitle')}</h1>
        <p className="mt-1 text-muted-foreground">{t('quoteFormSetupDescription')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('quoteFormSetupLayoutTitle')}</CardTitle>
          <CardDescription>{t('quoteFormSetupLayoutDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="intro_text">{t('quoteFormSetupIntroText')}</Label>
            <Textarea
              id="intro_text"
              value={config.intro_text ?? ''}
              onChange={(e) => setConfig((c) => ({ ...c, intro_text: e.target.value }))}
              placeholder={t('quoteFormSetupIntroPlaceholder')}
              className="mt-1 min-h-[80px]"
            />
          </div>
          <div>
            <Label htmlFor="submit_button_label">{t('quoteFormSetupSubmitLabel')}</Label>
            <Input
              id="submit_button_label"
              value={config.submit_button_label ?? ''}
              onChange={(e) => setConfig((c) => ({ ...c, submit_button_label: e.target.value }))}
              placeholder="Get My Estimate"
              className="mt-1 max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('quoteFormSetupContactFieldsTitle')}</CardTitle>
          <CardDescription>{t('quoteFormSetupContactFieldsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t('quoteFormSetupNameRequired')}</Label>
              <p className="text-xs text-muted-foreground">{t('quoteFormSetupNameRequiredHint')}</p>
            </div>
            <Switch
              checked={config.name_required ?? true}
              onCheckedChange={(v) => setConfig((c) => ({ ...c, name_required: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>{t('quoteFormSetupEmailRequired')}</Label>
              <p className="text-xs text-muted-foreground">{t('quoteFormSetupEmailRequiredHint')}</p>
            </div>
            <Switch
              checked={config.email_required ?? true}
              onCheckedChange={(v) => setConfig((c) => ({ ...c, email_required: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>{t('quoteFormSetupPhoneRequired')}</Label>
              <p className="text-xs text-muted-foreground">{t('quoteFormSetupPhoneRequiredHint')}</p>
            </div>
            <Switch
              checked={config.phone_required ?? false}
              onCheckedChange={(v) => setConfig((c) => ({ ...c, phone_required: v }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('quoteFormSetupEstimateTitle')}</CardTitle>
          <CardDescription>{t('quoteFormSetupEstimateDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t('quoteFormSetupShowEstimateInstantly')}</Label>
              <p className="text-xs text-muted-foreground">{t('quoteFormSetupShowEstimateInstantlyHint')}</p>
            </div>
            <Switch
              checked={config.show_estimate_instantly ?? true}
              onCheckedChange={(v) => setConfig((c) => ({ ...c, show_estimate_instantly: v }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>{t('quoteFormSetupShowExactEstimate')}</Label>
              <p className="text-xs text-muted-foreground">{t('quoteFormSetupShowExactEstimateHint')}</p>
            </div>
            <Select
              value={config.show_exact_estimate === true ? 'exact' : config.show_exact_estimate === false ? 'range' : 'exact'}
              onValueChange={(v) => setConfig((c) => ({ ...c, show_exact_estimate: v === 'exact' }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exact">{t('quoteFormSetupExactEstimate')}</SelectItem>
                <SelectItem value="range">{t('quoteFormSetupEstimateRange')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('save')}
        </Button>
      </div>
    </div>
  );
}
