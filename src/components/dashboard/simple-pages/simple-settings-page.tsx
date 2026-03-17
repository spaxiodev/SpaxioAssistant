'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Sparkles, Building2, MessageSquare, Palette } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  SimplePageHeader,
  SimpleAiAssistPanel,
  SimpleDeveloperModeLink,
} from '@/components/dashboard/simple';
import { useViewMode } from '@/contexts/view-mode-context';

type SettingsData = {
  business_name?: string | null;
  company_description?: string | null;
  services_offered?: string[] | null;
  contact_email?: string | null;
  phone?: string | null;
  chatbot_welcome_message?: string | null;
  primary_brand_color?: string | null;
};

export function SimpleSettingsPage() {
  const router = useRouter();
  const { setMode } = useViewMode();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SettingsData>({});

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings')
      .then((r) => {
        if (r.ok) return r.json() as Promise<SettingsData>;
        return {} as SettingsData;
      })
      .then((data) => {
        if (cancelled) return;
        setSettings(data);
        setForm({
          business_name: data?.business_name ?? '',
          company_description: data?.company_description ?? '',
          contact_email: data?.contact_email ?? '',
          phone: data?.phone ?? '',
          chatbot_welcome_message: data?.chatbot_welcome_message ?? '',
          primary_brand_color: data?.primary_brand_color ?? '',
        });
      })
      .catch(() => {
        if (!cancelled) setForm({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: form.business_name || null,
          companyDescription: form.company_description || null,
          contactEmail: form.contact_email || null,
          phone: form.phone || null,
          chatbotWelcomeMessage: form.chatbot_welcome_message || null,
          primaryBrandColor: form.primary_brand_color || null,
        }),
      });
      if (res.ok) {
        setSettings((prev) => ({ ...prev, ...form }));
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const hasGetSettings = settings !== null && !loading;

  return (
    <div className="space-y-8">
      <SimplePageHeader
        title="Business settings"
        description="Your business name, how the assistant greets visitors, and how they can contact you."
        icon={<Settings className="h-6 w-6" />}
      />

      {/* Simplified form - only show if we can load settings; API may be PUT-only */}
      {hasGetSettings ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Business info
            </CardTitle>
            <CardDescription>Basic details your assistant uses when talking to visitors.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="business_name">Business name</Label>
                <Input
                  id="business_name"
                  value={form.business_name ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact email</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={form.contact_email ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_description">Short description</Label>
              <Textarea
                id="company_description"
                rows={2}
                value={form.company_description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, company_description: e.target.value }))}
                placeholder="What your business does in one or two sentences."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primary_brand_color">Brand color (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary_brand_color"
                    value={form.primary_brand_color ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, primary_brand_color: e.target.value }))}
                    placeholder="#6366f1"
                  />
                  {form.primary_brand_color && (
                    <span
                      className="h-10 w-8 rounded border shrink-0"
                      style={{ backgroundColor: form.primary_brand_color }}
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="chatbot_welcome_message">Welcome message</Label>
              <Textarea
                id="chatbot_welcome_message"
                rows={2}
                value={form.chatbot_welcome_message ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, chatbot_welcome_message: e.target.value }))}
                placeholder="Hi! How can I help you today?"
              />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business info</CardTitle>
            <CardDescription>Edit your business name, description, contact details, and welcome message in Developer Mode.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => { setMode('developer'); router.push('/dashboard/settings'); }}>
              Open settings in Developer Mode
            </Button>
          </CardContent>
        </Card>
      )}

      <SimpleAiAssistPanel
        title="AI can help"
        description="Have AI write or improve your copy."
        actions={[
          {
            label: 'Write my welcome message',
            onClick: () => {
              try {
                window.localStorage.setItem('spaxio-ai-setup-intent', 'Write a friendly welcome message for my chat assistant that fits my business.');
              } catch {
                // ignore
              }
              router.push('/dashboard/ai-setup');
            },
          },
          {
            label: 'Improve my description',
            onClick: () => {
              try {
                window.localStorage.setItem('spaxio-ai-setup-intent', 'Rewrite my business description to be clear and professional for the assistant.');
              } catch {
                // ignore
              }
              router.push('/dashboard/ai-setup');
            },
          },
          {
            label: 'Rewrite this professionally',
            onClick: () => {
              try {
                window.localStorage.setItem('spaxio-ai-setup-intent', 'Rewrite my business info and welcome message in a professional tone.');
              } catch {
                // ignore
              }
              router.push('/dashboard/ai-setup');
            },
          },
        ]}
      />

      <SimpleDeveloperModeLink developerPath="/dashboard/settings" linkLabel="Open all settings in Developer Mode" />
    </div>
  );
}
