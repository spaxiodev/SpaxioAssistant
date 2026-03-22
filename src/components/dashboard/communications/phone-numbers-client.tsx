'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

type PhoneRow = {
  id: string;
  phone_number: string;
  provider_phone_number_sid: string | null;
  is_active: boolean;
  is_default: boolean;
  capabilities_json: Record<string, unknown>;
};

export function PhoneNumbersClient() {
  const t = useTranslations('dashboard');
  const [rows, setRows] = useState<PhoneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState('');
  const [sid, setSid] = useState('');
  const [isDefault, setIsDefault] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/communications/phone-numbers');
      const json = await res.json();
      setRows(json.numbers ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addNumber(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/dashboard/communications/phone-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phone.trim(),
          provider_phone_number_sid: sid.trim() || null,
          is_default: isDefault,
          capabilities_json: {},
        }),
      });
      if (res.ok) {
        setPhone('');
        setSid('');
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>{t('communicationsAddNumberTitle')}</CardTitle>
          <CardDescription>{t('communicationsAddNumberHint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void addNumber(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pn">{t('communicationsFieldE164')}</Label>
              <Input
                id="pn"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+15551234567"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sid">{t('communicationsFieldSid')}</Label>
              <Input id="sid" value={sid} onChange={(e) => setSid(e.target.value)} className="font-mono text-sm" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
              {t('communicationsDefaultOutbound')}
            </label>
            <Button type="submit" disabled={saving || !phone.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('communicationsSaveNumber')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>{t('communicationsYourNumbers')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : !rows.length ? (
            <p className="text-sm text-muted-foreground">{t('communicationsNoNumbers')}</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span className="font-mono">{r.phone_number}</span>
                  {r.is_default && (
                    <span className="text-xs text-muted-foreground">{t('communicationsDefaultOutbound')}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
