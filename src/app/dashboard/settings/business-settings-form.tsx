'use client';

import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { MessageSquare, Mail, Palette, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from '@/components/intl-link';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import type { BusinessSettings } from '@/lib/supabase/database.types';

const WidgetLogoImageCropDialog = dynamic(
  () => import('@/components/widget-logo-image-crop').then((m) => m.WidgetLogoImageCropDialog),
  { ssr: false }
);

function normalizeServices(value: string | string[]) {
  const rawServices = Array.isArray(value) ? value : value.split('\n');
  const seen = new Set<string>();

  return rawServices
    .map((service) => service.trim())
    .filter((service) => {
      if (!service || seen.has(service)) return false;
      seen.add(service);
      return true;
    });
}

export function BusinessSettingsForm({
  initial,
}: {
  initial?: Partial<BusinessSettings> | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('dashboard');
  const [loading, setLoading] = useState(false);

  const [businessName, setBusinessName] = useState(initial?.business_name ?? '');
  const [industry, setIndustry] = useState(initial?.industry ?? '');
  const [companyDescription, setCompanyDescription] = useState(initial?.company_description ?? '');
  const [servicesOffered, setServicesOffered] = useState(normalizeServices(initial?.services_offered ?? []).join('\n'));
  const [pricingNotes, setPricingNotes] = useState(initial?.pricing_notes ?? '');
  const [toneOfVoice, setToneOfVoice] = useState(initial?.tone_of_voice ?? 'professional');
  const [contactEmail, setContactEmail] = useState(initial?.contact_email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [leadNotificationEmail, setLeadNotificationEmail] = useState(initial?.lead_notification_email ?? '');
  const [primaryBrandColor, setPrimaryBrandColor] = useState(initial?.primary_brand_color ?? '#0f172a');
  const [chatbotName, setChatbotName] = useState(initial?.chatbot_name ?? '');
  const [chatbotWelcomeMessage, setChatbotWelcomeMessage] = useState(
    initial?.chatbot_welcome_message ?? 'Hi! How can I help you today?'
  );
  const [widgetLogoUrl, setWidgetLogoUrl] = useState(initial?.widget_logo_url ?? '');
  const [widgetEnabled, setWidgetEnabled] = useState(initial?.widget_enabled !== false);
  const [serviceBasePrices, setServiceBasePrices] = useState<Record<string, string>>(() => {
    const raw = initial?.service_base_prices;
    if (!raw || typeof raw !== 'object') return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (typeof k === 'string' && typeof v === 'number' && Number.isFinite(v)) {
        out[k] = String(v);
      }
    }
    return out;
  });
  const [logoCropDialogOpen, setLogoCropDialogOpen] = useState(false);
  const [logoCropImageSrc, setLogoCropImageSrc] = useState<string | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [widgetActionMappings, setWidgetActionMappings] = useState<Record<string, { selector?: string; url?: string; section_id?: string }>>(() => {
    const raw = (initial as Record<string, unknown>)?.widget_action_mappings;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out: Record<string, { selector?: string; url?: string; section_id?: string }> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === 'object' && v && !Array.isArray(v)) {
        const vv = v as Record<string, unknown>;
        out[k] = {};
        if (typeof vv.selector === 'string') out[k].selector = vv.selector;
        if (typeof vv.url === 'string') out[k].url = vv.url;
        if (typeof vv.section_id === 'string') out[k].section_id = vv.section_id;
      }
    }
    return out;
  });
  const ACTION_KEYS = ['open_contact_form', 'open_quote_form', 'open_booking_form', 'show_pricing', 'scroll_to_section', 'open_link'] as const;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const services = normalizeServices(servicesOffered);
    const basePricesPayload: Record<string, number> = {};
    for (const svc of services) {
      const v = serviceBasePrices[svc];
      if (v !== undefined && v !== '') {
        const n = Number(v);
        if (Number.isFinite(n) && n >= 0) basePricesPayload[svc] = n;
      }
    }
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: businessName || null,
        industry: industry || null,
        companyDescription: companyDescription || null,
        servicesOffered: services,
        pricingNotes: pricingNotes || null,
        toneOfVoice: toneOfVoice || null,
        contactEmail: contactEmail || null,
        phone: phone || null,
        leadNotificationEmail: leadNotificationEmail || null,
        primaryBrandColor: primaryBrandColor || null,
        chatbotName: chatbotName || null,
        chatbotWelcomeMessage: chatbotWelcomeMessage || null,
        widgetLogoUrl: widgetLogoUrl || null,
        widgetEnabled,
        serviceBasePrices: basePricesPayload,
        widgetActionMappings: widgetActionMappings,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
      return;
    }
    toast({ title: 'Saved', description: 'Settings updated.' });
    router.refresh();
  }

  const servicesList = normalizeServices(servicesOffered);

  const openLogoCropDialog = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setLogoCropImageSrc(url);
    setLogoCropDialogOpen(true);
  }, []);

  const closeLogoCropDialog = useCallback(() => {
    setLogoCropDialogOpen(false);
    if (logoCropImageSrc) {
      URL.revokeObjectURL(logoCropImageSrc);
      setLogoCropImageSrc(null);
    }
  }, [logoCropImageSrc]);

  const handleLogoCropComplete = useCallback(
    async (blob: Blob) => {
      const file = new File([blob], 'widget-logo.png', { type: 'image/png' });
      const form = new FormData();
      form.append('file', file);
      try {
        const res = await fetch('/api/settings/logo-upload', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) {
          toast({ title: 'Upload failed', description: data?.error ?? 'Could not upload logo', variant: 'destructive' });
          return;
        }
        if (data?.url) setWidgetLogoUrl(data.url);
        toast({ title: 'Logo updated', description: 'Widget logo has been set.' });
      } finally {
        closeLogoCropDialog();
      }
    },
    [toast, closeLogoCropDialog]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="overflow-hidden border border-border-soft shadow-sm">
        <CardHeader className="border-b border-border-soft bg-muted/30 pb-6">
          <CardTitle className="text-xl">Business info</CardTitle>
          <CardDescription className="mt-1.5">Used by the AI to represent your company.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business name</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Acme Landscaping"
                className="rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Landscaping"
                className="rounded-lg"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyDescription">Company description</Label>
            <Textarea
              id="companyDescription"
              value={companyDescription}
              onChange={(e) => setCompanyDescription(e.target.value)}
              placeholder="We provide lawn care and garden design..."
              rows={3}
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="servicesOffered">Services offered (one per line)</Label>
            <Textarea
              id="servicesOffered"
              value={servicesOffered}
              onChange={(e) => setServicesOffered(e.target.value)}
              placeholder="Lawn mowing&#10;Garden design&#10;Tree trimming"
              rows={4}
              className="rounded-lg font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pricingNotes">Pricing notes</Label>
            <Textarea
              id="pricingNotes"
              value={pricingNotes}
              onChange={(e) => setPricingNotes(e.target.value)}
              placeholder="Pricing varies by project size. Free estimates."
              rows={2}
              className="rounded-lg"
            />
          </div>
          <div className="rounded-lg border border-border-soft bg-muted/20 p-4">
            <h4 className="mb-1 text-sm font-medium">Quote request base prices</h4>
            <p className="mb-4 text-xs text-muted-foreground">
              Set a minimum price per service. When a visitor mentions their budget in chat, quote requests with a
              budget below this are marked &quot;Not worth it&quot; on the Quote Requests page so you can skip them.
            </p>
            {servicesList.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add services above, then set a minimum price for each.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {servicesList.map((svc) => (
                  <div key={svc} className="flex items-center gap-2">
                    <Label htmlFor={`base-${svc}`} className="min-w-0 shrink text-sm font-normal text-muted-foreground">
                      {svc}
                    </Label>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        id={`base-${svc}`}
                        type="number"
                        min={0}
                        step={1}
                        placeholder="Min"
                        value={serviceBasePrices[svc] ?? ''}
                        onChange={(e) =>
                          setServiceBasePrices((prev) => ({ ...prev, [svc]: e.target.value }))
                        }
                        className="h-9 w-24 rounded-lg"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border border-border-soft shadow-sm">
        <CardHeader className="border-b border-border-soft bg-muted/30 pb-6">
          <CardTitle className="text-xl">Assistant & contact</CardTitle>
          <CardDescription className="mt-1.5">
            Tone, welcome message, and contact details.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border/30">
          {/* Voice & message */}
          <div className="space-y-4 py-6 first:pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Voice & message
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chatbotName" className="text-muted-foreground">Assistant name</Label>
                <Input
                  id="chatbotName"
                  value={chatbotName}
                  onChange={(e) => setChatbotName(e.target.value)}
                  placeholder="Spaxio Assistant"
                  className="h-10 rounded-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Shown at the top of the chat window.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="toneOfVoice" className="text-muted-foreground">Tone of voice</Label>
                <Input
                  id="toneOfVoice"
                  value={toneOfVoice}
                  onChange={(e) => setToneOfVoice(e.target.value)}
                  placeholder="professional, friendly, casual"
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chatbotWelcomeMessage" className="text-muted-foreground">Welcome message</Label>
                <Input
                  id="chatbotWelcomeMessage"
                  value={chatbotWelcomeMessage}
                  onChange={(e) => setChatbotWelcomeMessage(e.target.value)}
                  placeholder="Hi! How can I help you today?"
                  className="h-10 rounded-lg"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-border-soft bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {t('installPromptInSettings')}
              </p>
              <Button type="button" variant="default" className="shrink-0 rounded-lg" asChild>
                <Link href="/dashboard/install" className="inline-flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  {t('getInstallCode')}
                </Link>
              </Button>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4 py-6">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Contact
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactEmail" className="text-muted-foreground">Contact email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="hello@example.com"
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-muted-foreground">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                  className="h-10 rounded-lg"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="leadNotificationEmail" className="text-muted-foreground">Lead notification email</Label>
                <Input
                  id="leadNotificationEmail"
                  type="email"
                  value={leadNotificationEmail}
                  onChange={(e) => setLeadNotificationEmail(e.target.value)}
                  placeholder="leads@example.com"
                  className="h-10 rounded-lg"
                />
                <p className="text-xs text-muted-foreground">We send new lead alerts to this address.</p>
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="space-y-4 py-6">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Palette className="h-4 w-4 text-muted-foreground" />
              Branding
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border-soft bg-muted/20 p-4">
              <input
                type="checkbox"
                id="widgetEnabled"
                checked={widgetEnabled}
                onChange={(e) => setWidgetEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-border-soft"
              />
              <div className="flex-1">
                <Label htmlFor="widgetEnabled" className="cursor-pointer font-medium text-foreground">
                  Show the assistant on my website
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Turn off to hide the widget on your site. The install code can stay in place; visitors will not see the assistant until you turn this back on.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryBrandColor" className="text-muted-foreground">Primary brand color</Label>
              <div className="flex items-center gap-3 rounded-xl border border-border-soft bg-muted/20 p-3">
                <input
                  type="color"
                  id="primaryBrandColor"
                  value={primaryBrandColor}
                  onChange={(e) => setPrimaryBrandColor(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-border-soft bg-background shadow-sm"
                />
                <Input
                  value={primaryBrandColor}
                  onChange={(e) => setPrimaryBrandColor(e.target.value)}
                  placeholder="#0f172a"
                  className="h-10 flex-1 rounded-lg font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="widgetLogoUrl" className="text-muted-foreground">Chat widget logo (optional)</Label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Input
                    id="widgetLogoUrl"
                    value={widgetLogoUrl}
                    onChange={(e) => setWidgetLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="h-10 rounded-lg"
                  />
                  {widgetLogoUrl && (
                    <div className="flex items-center gap-3 rounded-lg border border-border-soft bg-muted/20 p-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-soft bg-background">
                        <img
                          src={widgetLogoUrl}
                          alt="Widget logo preview"
                          className="h-full w-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <span className="min-w-0 truncate text-xs text-muted-foreground">Preview</span>
                    </div>
                  )}
                </div>
                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    openLogoCropDialog(file);
                    e.target.value = '';
                  }}
                  className="sr-only"
                  aria-hidden
                />
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  className="shrink-0 rounded-lg"
                  onClick={() => logoFileInputRef.current?.click()}
                >
                  {widgetLogoUrl ? 'Change image' : 'Upload image'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This image appears inside the chat bubble. Paste a URL or upload to crop and adjust before saving.
              </p>
            </div>
            <WidgetLogoImageCropDialog
              open={logoCropDialogOpen}
              onOpenChange={(open) => {
                if (!open) closeLogoCropDialog();
                else setLogoCropDialogOpen(open);
              }}
              imageSrc={logoCropImageSrc}
              onComplete={handleLogoCropComplete}
              onCancel={closeLogoCropDialog}
            />
          </div>

        </CardContent>
      </Card>

      <Card className="overflow-hidden border border-border-soft shadow-sm">
        <CardHeader className="border-b border-border-soft bg-muted/30 pb-6">
          <CardTitle className="text-xl">Widget website actions</CardTitle>
          <CardDescription className="mt-1.5">
            When the AI suggests opening a form or scrolling, the widget can trigger these on your site. Optional: set a CSS selector, URL, or section ID for each action.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {ACTION_KEYS.map((key) => (
            <div key={key} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-3">
              <Label className="font-mono text-sm">{key.replace(/_/g, ' ')}</Label>
              <Input
                placeholder="Selector (e.g. #contact-form)"
                value={widgetActionMappings[key]?.selector ?? ''}
                onChange={(e) =>
                  setWidgetActionMappings((prev) => ({
                    ...prev,
                    [key]: { ...prev[key], selector: e.target.value || undefined },
                  }))
                }
                className="rounded-lg"
              />
              <div className="flex gap-2 sm:col-span-2">
                <Input
                  placeholder="URL or #section"
                  value={widgetActionMappings[key]?.url ?? ''}
                  onChange={(e) =>
                    setWidgetActionMappings((prev) => ({
                      ...prev,
                      [key]: { ...prev[key], url: e.target.value || undefined },
                    }))
                  }
                  className="rounded-lg"
                />
                <Input
                  placeholder="Section ID"
                  value={widgetActionMappings[key]?.section_id ?? ''}
                  onChange={(e) =>
                    setWidgetActionMappings((prev) => ({
                      ...prev,
                      [key]: { ...prev[key], section_id: e.target.value || undefined },
                    }))
                  }
                  className="w-28 rounded-lg"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button
        type="submit"
        className="rounded-lg px-6 shadow-sm"
        disabled={loading}
      >
        {loading ? 'Saving...' : 'Save settings'}
      </Button>
    </form>
  );
}
