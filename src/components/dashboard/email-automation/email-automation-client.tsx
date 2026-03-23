'use client';

import { useState, useTransition, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Mail,
  Globe,
  Sparkles,
  Clock,
  Shield,
  Plug,
  Inbox,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Check,
  Plus,
  Trash2,
  Languages,
  RefreshCw,
  Server,
  ExternalLink,
  Star,
  Loader2,
  WifiOff,
} from 'lucide-react';
import type {
  EmailAutomationSettings,
  EmailProvider,
  EmailReplyTemplate,
  InboundEmail,
  TonePreset,
} from '@/lib/email-automation/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  initialSettings: EmailAutomationSettings;
  initialTemplates: EmailReplyTemplate[];
  initialProviders: EmailProvider[];
  initialInboundEmails: InboundEmail[];
  baseUrl: string;
};

const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
];

const TONE_OPTIONS: { value: TonePreset; label: string; description: string }[] = [
  { value: 'professional', label: 'Professional', description: 'Formal and polished' },
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { value: 'luxury', label: 'Luxury', description: 'Premium and refined' },
  { value: 'concise', label: 'Concise', description: 'Short and to the point' },
];

const PROVIDER_OPTIONS = [
  {
    value: 'resend',
    label: 'Resend',
    description: 'Use Resend for inbound routing and outbound auto-replies',
    connectMode: 'webhook' as const,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusIcon(status: string) {
  if (status === 'replied') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === 'failed') return <XCircle className="h-4 w-4 text-destructive" />;
  if (status === 'skipped') return <AlertCircle className="h-4 w-4 text-amber-500" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

function statusBadge(status: string) {
  if (status === 'replied') return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 text-xs">Replied</Badge>;
  if (status === 'failed') return <Badge variant="destructive" className="text-xs">Failed</Badge>;
  if (status === 'skipped') return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-0 text-xs">Skipped</Badge>;
  return <Badge variant="secondary" className="text-xs">Pending</Badge>;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function languageName(code: string | null): string {
  if (!code) return '—';
  return LANGUAGE_OPTIONS.find((l) => l.code === code)?.name ?? code.toUpperCase();
}

// ── Copy Button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────

function SettingsTab({
  settings,
  onSave,
  saving,
}: {
  settings: EmailAutomationSettings;
  onSave: (updated: Partial<EmailAutomationSettings>) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    enabled: settings.enabled,
    fallback_language: settings.fallback_language,
    ai_enhancement_enabled: settings.ai_enhancement_enabled,
    ai_translate_enabled: settings.ai_translate_enabled,
    tone_preset: settings.tone_preset as TonePreset,
    business_hours_enabled: settings.business_hours_enabled,
    away_message_enabled: settings.away_message_enabled,
    away_message_text: settings.away_message_text ?? '',
    away_message_language: settings.away_message_language,
    max_auto_replies_per_thread: settings.max_auto_replies_per_thread,
    cooldown_hours: settings.cooldown_hours,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      away_message_text: form.away_message_text || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Master toggle */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Auto Reply Status</CardTitle>
              <CardDescription className="mt-1">
                When enabled, incoming emails will automatically receive a reply in the customer&apos;s detected language.
              </CardDescription>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Language settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-primary" />
            Language Settings
          </CardTitle>
          <CardDescription>
            Replies are automatically sent in the customer&apos;s detected language. Configure fallback and translation options below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="fallback_language">Fallback Language</Label>
            <p className="text-xs text-muted-foreground">Used when language detection fails or no template is available.</p>
            <Select
              value={form.fallback_language}
              onValueChange={(v) => setForm((f) => ({ ...f, fallback_language: v }))}
            >
              <SelectTrigger id="fallback_language" className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="font-medium">AI-Powered Translations</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Translate the fallback template when no template exists for the detected language.
              </p>
            </div>
            <Switch
              checked={form.ai_translate_enabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, ai_translate_enabled: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Enhancement */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Enhancement
          </CardTitle>
          <CardDescription>
            Let AI rewrite replies to match your brand tone while keeping them short and safe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="font-medium">Enable AI Tone Rewriting</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                AI will rewrite your reply templates to better match your selected tone.
              </p>
            </div>
            <Switch
              checked={form.ai_enhancement_enabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, ai_enhancement_enabled: v }))}
            />
          </div>

          {form.ai_enhancement_enabled && (
            <div className="grid gap-1.5">
              <Label>Tone Preset</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TONE_OPTIONS.map((tone) => (
                  <button
                    key={tone.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, tone_preset: tone.value }))}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      form.tone_preset === tone.value
                        ? 'border-primary bg-primary/5 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.4)]'
                        : 'hover:border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="text-sm font-medium">{tone.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{tone.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Away message */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-primary" />
            Away Message
          </CardTitle>
          <CardDescription>
            Optionally add an additional note for emails received outside business hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="font-medium">Enable Away Message</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Append an away note to auto replies.
              </p>
            </div>
            <Switch
              checked={form.away_message_enabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, away_message_enabled: v }))}
            />
          </div>

          {form.away_message_enabled && (
            <div className="space-y-3">
              <div className="grid gap-1.5">
                <Label htmlFor="away_message_text">Away Message Text</Label>
                <Textarea
                  id="away_message_text"
                  value={form.away_message_text}
                  onChange={(e) => setForm((f) => ({ ...f, away_message_text: e.target.value }))}
                  placeholder="Our team is currently unavailable. We will respond within 1 business day."
                  rows={3}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="away_message_language">Away Message Language</Label>
                <Select
                  value={form.away_message_language}
                  onValueChange={(v) => setForm((f) => ({ ...f, away_message_language: v }))}
                >
                  <SelectTrigger id="away_message_language" className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((l) => (
                      <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Safety / limits */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" />
            Safety &amp; Limits
          </CardTitle>
          <CardDescription>
            Prevent reply loops and limit the number of automated replies per conversation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="max_replies">Max Auto Replies per Thread</Label>
            <p className="text-xs text-muted-foreground">Set to 1 to send only one confirmation per conversation.</p>
            <Select
              value={String(form.max_auto_replies_per_thread)}
              onValueChange={(v) => setForm((f) => ({ ...f, max_auto_replies_per_thread: parseInt(v) }))}
            >
              <SelectTrigger id="max_replies" className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n === 1 ? '1 (recommended)' : String(n)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cooldown_hours">Cooldown Between Replies (hours)</Label>
            <p className="text-xs text-muted-foreground">Minimum hours between auto replies to the same sender.</p>
            <Select
              value={String(form.cooldown_hours)}
              onValueChange={(v) => setForm((f) => ({ ...f, cooldown_hours: parseInt(v) }))}
            >
              <SelectTrigger id="cooldown_hours" className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 4, 8, 12, 24, 48, 72].map((h) => (
                  <SelectItem key={h} value={String(h)}>{h}h</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </Button>
      </div>
    </form>
  );
}

// ── Templates Tab ─────────────────────────────────────────────────────────────

function TemplatesTab({
  templates,
  onSave,
  onDelete,
  saving,
}: {
  templates: EmailReplyTemplate[];
  onSave: (template: { language_code: string; language_name: string; subject_template: string; body_template: string; is_active: boolean }) => void;
  onDelete: (languageCode: string) => void;
  saving: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newLang, setNewLang] = useState('');
  const [newLangName, setNewLangName] = useState('');
  const [editValues, setEditValues] = useState<Record<string, { subject: string; body: string; is_active: boolean }>>({});

  function startEdit(t: EmailReplyTemplate) {
    setEditing(t.language_code);
    setEditValues((prev) => ({
      ...prev,
      [t.language_code]: {
        subject: t.subject_template ?? '',
        body: t.body_template,
        is_active: t.is_active,
      },
    }));
  }

  function cancelEdit() {
    setEditing(null);
  }

  function saveEdit(langCode: string, langName: string) {
    const vals = editValues[langCode];
    if (!vals) return;
    onSave({
      language_code: langCode,
      language_name: langName,
      subject_template: vals.subject,
      body_template: vals.body,
      is_active: vals.is_active,
    });
    setEditing(null);
  }

  function handleAddNew() {
    if (!newLang) return;
    const name = newLangName || LANGUAGE_OPTIONS.find((l) => l.code === newLang)?.name || newLang;
    onSave({
      language_code: newLang,
      language_name: name,
      subject_template: 'Re: {{original_subject}}',
      body_template: `Hi {{customer_name}},\n\nThank you for reaching out. We've received your message and will get back to you shortly.\n\nBest regards,\n{{business_name}}`,
      is_active: true,
    });
    setAddingNew(false);
    setNewLang('');
    setNewLangName('');
  }

  const existingCodes = new Set(templates.map((t) => t.language_code));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
        <p>
          <span className="font-medium">Template variables you can use:</span>{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{'{{customer_name}}'}</code>,{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{'{{business_name}}'}</code>,{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{'{{original_subject}}'}</code>
        </p>
        <p className="mt-1 text-muted-foreground text-xs">
          Replies are sent in the customer&apos;s detected language. If no template exists for their language and AI translation is enabled, the fallback template will be automatically translated.
        </p>
      </div>

      {templates.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <Languages className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No templates yet. Add your first reply template below.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {templates.map((template) => (
          <Card key={template.language_code} className={!template.is_active ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{template.language_name}</CardTitle>
                  <Badge variant="outline" className="text-xs font-mono">{template.language_code.toUpperCase()}</Badge>
                  {!template.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  {editing === template.language_code ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => saveEdit(template.language_code, template.language_name)}
                        disabled={saving}
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => startEdit(template)}>Edit</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(template.language_code)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {editing === template.language_code ? (
                <>
                  <div className="grid gap-1.5">
                    <Label>Subject Template</Label>
                    <Input
                      value={editValues[template.language_code]?.subject ?? ''}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          [template.language_code]: {
                            ...prev[template.language_code]!,
                            subject: e.target.value,
                          },
                        }))
                      }
                      placeholder="Re: {{original_subject}}"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Reply Body</Label>
                    <Textarea
                      value={editValues[template.language_code]?.body ?? ''}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          [template.language_code]: {
                            ...prev[template.language_code]!,
                            body: e.target.value,
                          },
                        }))
                      }
                      rows={6}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editValues[template.language_code]?.is_active ?? true}
                      onCheckedChange={(v) =>
                        setEditValues((prev) => ({
                          ...prev,
                          [template.language_code]: {
                            ...prev[template.language_code]!,
                            is_active: v,
                          },
                        }))
                      }
                    />
                    <Label>Active</Label>
                  </div>
                </>
              ) : (
                <>
                  {template.subject_template && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Subject</p>
                      <p className="mt-0.5 text-sm font-mono">{template.subject_template}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Body</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground line-clamp-4">{template.body_template}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add new template */}
      {addingNew ? (
        <Card className="border-dashed border-primary/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Language Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-1.5">
              <Label>Language</Label>
              <Select value={newLang} onValueChange={setNewLang}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select language…" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.filter((l) => !existingCodes.has(l.code)).map((l) => (
                    <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                  ))}
                  <SelectItem value="other">Other (custom code)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newLang === 'other' && (
              <div className="grid gap-1.5">
                <Label>Custom language code (ISO 639-1)</Label>
                <Input
                  value={newLangName}
                  onChange={(e) => setNewLangName(e.target.value)}
                  placeholder="e.g. pl"
                  className="w-[120px]"
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddNew} disabled={!newLang || saving}>
                Add Template
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setAddingNew(false); setNewLang(''); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => setAddingNew(true)}
        >
          <Plus className="h-4 w-4" />
          Add Language Template
        </Button>
      )}
    </div>
  );
}

// ── Provider Status Badge ─────────────────────────────────────────────────────

function ProviderStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    connected: {
      label: 'Connected',
      cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-0',
    },
    connecting: {
      label: 'Connecting…',
      cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-0',
    },
    needs_reconnect: {
      label: 'Needs Reconnect',
      cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-0',
    },
    error: {
      label: 'Error',
      cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-0',
    },
    disabled: {
      label: 'Disabled',
      cls: 'bg-muted text-muted-foreground border-0',
    },
  };
  const { label, cls } = map[status] ?? { label: 'Disconnected', cls: 'bg-muted text-muted-foreground border-0' };
  return <Badge className={`text-xs ${cls}`}>{label}</Badge>;
}

// ── Provider Card ─────────────────────────────────────────────────────────────

function ProviderCard({
  provider,
  baseUrl,
  onDelete,
  onTest,
  onReconnect,
  onSetDefault,
  onToggleDisabled,
  saving,
}: {
  provider: EmailProvider;
  baseUrl: string;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  onReconnect: (provider: EmailProvider) => void;
  onSetDefault: (id: string) => void;
  onToggleDisabled: (provider: EmailProvider) => void;
  saving: boolean;
}) {
  const typeInfo = PROVIDER_OPTIONS.find((p) => p.value === provider.provider_type);
  const name =
    provider.display_name ??
    typeInfo?.label ??
    provider.provider_type;

  const webhookUrl =
    provider.inbound_webhook_token
      ? `${baseUrl}/api/email-automation/inbound/webhook?token=${provider.inbound_webhook_token}`
      : null;

  const isOAuth = provider.provider_type === 'gmail' || provider.provider_type === 'outlook';
  const isImap = provider.provider_type === 'imap';
  const needsAction =
    provider.status === 'needs_reconnect' ||
    provider.status === 'error' ||
    provider.status === 'connecting';
  const isDisabled = provider.status === 'disabled';

  return (
    <Card className={isDisabled ? 'opacity-60' : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold leading-tight">{name}</span>
                <ProviderStatusBadge status={provider.status} />
                {provider.is_default && (
                  <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Default</Badge>
                )}
              </div>
              {provider.connected_email && (
                <p className="mt-0.5 text-xs text-muted-foreground truncate">{provider.connected_email}</p>
              )}
              {provider.last_verified_at && (
                <p className="mt-0.5 text-xs text-muted-foreground/60">
                  Verified {formatRelativeTime(provider.last_verified_at)}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {!provider.is_default && provider.status === 'connected' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-muted-foreground gap-1"
                title="Set as default sending provider"
                onClick={() => onSetDefault(provider.id)}
                disabled={saving}
              >
                <Star className="h-3 w-3" />
              </Button>
            )}
            {provider.status === 'connected' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-muted-foreground gap-1"
                title="Test connection"
                onClick={() => onTest(provider.id)}
                disabled={saving}
              >
                <Wifi className="h-3 w-3" />
              </Button>
            )}
            {(isOAuth || isImap) && needsAction && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-amber-600 dark:text-amber-400 gap-1"
                onClick={() => onReconnect(provider)}
                disabled={saving}
              >
                <RefreshCw className="h-3 w-3" />
                Reconnect
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground"
              title={isDisabled ? 'Enable provider' : 'Disable provider'}
              onClick={() => onToggleDisabled(provider)}
              disabled={saving}
            >
              {isDisabled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-muted-foreground hover:text-destructive"
              title="Remove provider"
              onClick={() => onDelete(provider.id)}
              disabled={saving}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Status message */}
        {provider.status_message && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{provider.status_message}</p>
        )}
      </CardHeader>

      {/* Webhook URL section */}
      {webhookUrl && (
        <CardContent className="pt-0 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Inbound Webhook URL</p>
          <p className="text-xs text-muted-foreground mb-1">
            Configure your email provider to POST inbound emails as JSON to this URL.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-xs font-mono break-all">
              {webhookUrl}
            </code>
            <CopyButton text={webhookUrl} />
          </div>
          <div className="mt-2 rounded-md border bg-muted/50 p-3">
            <p className="text-xs font-medium mb-1">Expected JSON payload:</p>
            <pre className="text-xs text-muted-foreground overflow-auto">{`{
  "senderEmail": "customer@example.com",
  "senderName": "John Doe",
  "subject": "Question about your services",
  "bodyText": "Hi, I'd like to know...",
  "messageId": "<msg-id@mail.example.com>",
  "threadId": "optional-thread-id"
}`}</pre>
          </div>
        </CardContent>
      )}

      {/* OAuth capability note */}
      {isOAuth && provider.status === 'connected' && (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground rounded-md bg-muted/50 border px-3 py-2">
            <strong>Sending:</strong> Auto-replies will be sent from {provider.connected_email ?? 'your connected account'}.
            Inbound emails are still received via webhook — configure your email provider to forward to a webhook if needed.
          </p>
        </CardContent>
      )}

      {/* Reconnect prompt for OAuth */}
      {isOAuth && (provider.status === 'needs_reconnect' || provider.status === 'error') && (
        <CardContent className="pt-0">
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="text-xs text-amber-700 dark:text-amber-400">
              <p className="font-medium">Reconnection required</p>
              <p className="mt-0.5">
                {provider.status_message ?? 'The authorization has expired or been revoked.'}
                {' '}Click <strong>Reconnect</strong> to re-authorize.
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Inline Wifi icon (lucide doesn't export it by default in older versions)
function Wifi({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
      <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
      <circle cx="12" cy="20" r="1"/>
    </svg>
  );
}

// ── IMAP Credential Form ──────────────────────────────────────────────────────

interface ImapFormState {
  email: string;
  from_name: string;
  password: string;
  imap_host: string;
  imap_port: string;
  imap_secure: boolean;
  smtp_host: string;
  smtp_port: string;
  smtp_secure: boolean;
}

const DEFAULT_IMAP_FORM: ImapFormState = {
  email: '',
  from_name: '',
  password: '',
  imap_host: '',
  imap_port: '993',
  imap_secure: true,
  smtp_host: '',
  smtp_port: '587',
  smtp_secure: false,
};

interface ImapTestResult {
  ok: boolean;
  imap_ok?: boolean;
  smtp_ok?: boolean;
  imap_error?: string | null;
  smtp_error?: string | null;
  error?: string;
}

function ImapForm({
  onSave,
  onCancel,
  saving,
}: {
  onSave: (body: Record<string, unknown>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<ImapFormState>(DEFAULT_IMAP_FORM);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ImapTestResult | null>(null);

  function set(field: keyof ImapFormState, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
    setTestResult(null); // reset test result when form changes
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/email-automation/providers/imap/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          imap_host: form.imap_host.trim(),
          imap_port: parseInt(form.imap_port, 10),
          imap_secure: form.imap_secure,
          smtp_host: form.smtp_host.trim(),
          smtp_port: parseInt(form.smtp_port, 10),
          smtp_secure: form.smtp_secure,
        }),
      });
      const data: ImapTestResult = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ ok: false, error: 'Network error — could not reach the test endpoint.' });
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    onSave({
      provider_type: 'imap',
      display_name: form.email.trim(),
      email: form.email.trim(),
      from_name: form.from_name.trim() || null,
      password: form.password,
      imap_host: form.imap_host.trim(),
      imap_port: parseInt(form.imap_port, 10),
      imap_secure: form.imap_secure,
      smtp_host: form.smtp_host.trim(),
      smtp_port: parseInt(form.smtp_port, 10),
      smtp_secure: form.smtp_secure,
    });
  }

  const isValid =
    form.email.trim() &&
    form.password &&
    form.imap_host.trim() &&
    form.smtp_host.trim() &&
    parseInt(form.imap_port, 10) > 0 &&
    parseInt(form.smtp_port, 10) > 0;

  return (
    <div className="space-y-4">
      {/* App password notice */}
      <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 px-3 py-2.5">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="text-xs text-amber-700 dark:text-amber-400">
            <p className="font-medium">Use an App Password</p>
            <p className="mt-0.5">
              Gmail and Outlook require an <strong>app password</strong> (not your regular login password) when 2-step
              verification is enabled.{' '}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noopener noreferrer"
                className="underline inline-flex items-center gap-0.5"
              >
                Gmail <ExternalLink className="h-2.5 w-2.5" />
              </a>
              {' · '}
              <a
                href="https://account.live.com/proofs/manage/additional"
                target="_blank"
                rel="noopener noreferrer"
                className="underline inline-flex items-center gap-0.5"
              >
                Microsoft <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="imap_email">Email Address</Label>
          <Input
            id="imap_email"
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="support@yourcompany.com"
            autoComplete="off"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="imap_from_name">From Name (optional)</Label>
          <Input
            id="imap_from_name"
            value={form.from_name}
            onChange={(e) => set('from_name', e.target.value)}
            placeholder="e.g. Support Team"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="imap_password">Password / App Password</Label>
        <Input
          id="imap_password"
          type="password"
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
          placeholder="App password or account password"
          autoComplete="new-password"
        />
      </div>

      {/* IMAP */}
      <div className="rounded-lg border p-3 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <Server className="h-3.5 w-3.5" />
          IMAP (Inbound)
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_100px_auto]">
          <div className="grid gap-1">
            <Label htmlFor="imap_host" className="text-xs">Host</Label>
            <Input
              id="imap_host"
              value={form.imap_host}
              onChange={(e) => set('imap_host', e.target.value)}
              placeholder="imap.yourcompany.com"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="imap_port" className="text-xs">Port</Label>
            <Input
              id="imap_port"
              type="number"
              value={form.imap_port}
              onChange={(e) => set('imap_port', e.target.value)}
              placeholder="993"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">TLS/SSL</Label>
            <div className="flex items-center h-10">
              <Switch
                checked={form.imap_secure}
                onCheckedChange={(v) => {
                  set('imap_secure', v);
                  if (v && form.imap_port === '143') set('imap_port', '993');
                  if (!v && form.imap_port === '993') set('imap_port', '143');
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* SMTP */}
      <div className="rounded-lg border p-3 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          <Mail className="h-3.5 w-3.5" />
          SMTP (Outbound / Replies)
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_100px_auto]">
          <div className="grid gap-1">
            <Label htmlFor="smtp_host" className="text-xs">Host</Label>
            <Input
              id="smtp_host"
              value={form.smtp_host}
              onChange={(e) => set('smtp_host', e.target.value)}
              placeholder="smtp.yourcompany.com"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="smtp_port" className="text-xs">Port</Label>
            <Input
              id="smtp_port"
              type="number"
              value={form.smtp_port}
              onChange={(e) => set('smtp_port', e.target.value)}
              placeholder="587"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">TLS/SSL</Label>
            <div className="flex items-center h-10">
              <Switch
                checked={form.smtp_secure}
                onCheckedChange={(v) => {
                  set('smtp_secure', v);
                  if (v && form.smtp_port === '587') set('smtp_port', '465');
                  if (!v && form.smtp_port === '465') set('smtp_port', '587');
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Test result */}
      {testResult && (
        <div
          className={`rounded-md border px-3 py-2.5 text-xs ${
            testResult.ok
              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'
              : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20 text-red-700 dark:text-red-400'
          }`}
        >
          {testResult.ok ? (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              IMAP and SMTP connected successfully.
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-medium">
                <XCircle className="h-3.5 w-3.5" />
                Connection test failed
              </div>
              {testResult.imap_error && (
                <p>IMAP: {testResult.imap_error}</p>
              )}
              {testResult.smtp_error && (
                <p>SMTP: {testResult.smtp_error}</p>
              )}
              {testResult.error && <p>{testResult.error}</p>}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleTest}
          disabled={!isValid || testing || saving}
          className="gap-1.5"
        >
          {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
          Test Connection
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!isValid || saving}
          className="gap-1.5"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Save Provider
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Providers Tab ─────────────────────────────────────────────────────────────

function ProvidersTab({
  providers,
  baseUrl,
  onAdd,
  onDelete,
  onTest,
  onReconnect,
  onSetDefault,
  onToggleDisabled,
  saving,
}: {
  providers: EmailProvider[];
  baseUrl: string;
  onAdd: (body: Record<string, unknown>) => void;
  onDelete: (providerId: string) => void;
  onTest: (providerId: string) => void;
  onReconnect: (provider: EmailProvider) => void;
  onSetDefault: (providerId: string) => void;
  onToggleDisabled: (provider: EmailProvider) => void;
  saving: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState('resend');

  const selectedOption = PROVIDER_OPTIONS.find((p) => p.value === addType);

  function handleWebhookAdd(displayName: string) {
    onAdd({ provider_type: addType, display_name: displayName || null });
    setShowAdd(false);
    setAddType('resend');
  }

  const atLimit = providers.length >= 1;

  // Local state for webhook/resend display name input
  const [webhookDisplayName, setWebhookDisplayName] = useState('');

  return (
    <div className="space-y-4">
      {/* Info card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Plug className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-medium">Email provider connections</p>
              <p className="mt-1 text-muted-foreground">
                Email automation uses <strong>Resend only</strong> for both inbound routing and outbound auto-replies.
                Add a single Resend provider to generate your inbound webhook URL.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider list */}
      {providers.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Mail className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No email provider connected yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add your Resend provider below to start routing inbound emails and sending auto-replies.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              baseUrl={baseUrl}
              onDelete={onDelete}
              onTest={onTest}
              onReconnect={onReconnect}
              onSetDefault={onSetDefault}
              onToggleDisabled={onToggleDisabled}
              saving={saving}
            />
          ))}
        </div>
      )}

      {/* Add Provider Form */}
      {showAdd ? (
        <Card className="border-dashed border-primary/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add Email Provider</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Provider type selection */}
            <div className="grid gap-1.5">
              <Label>Provider Type</Label>
              <div className="grid gap-2">
                {PROVIDER_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setAddType(p.value)}
                    className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                      addType === p.value
                        ? 'border-primary bg-primary/5 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.4)]'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{p.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{p.description}</div>
                    </div>
                    {addType === p.value && (
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Action area based on selected type */}
            {selectedOption?.connectMode === 'webhook' && (
              <div className="space-y-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="webhook_display_name">Display Name (optional)</Label>
                  <Input
                    id="webhook_display_name"
                    value={webhookDisplayName}
                    onChange={(e) => setWebhookDisplayName(e.target.value)}
                    placeholder="e.g. Main Inbox"
                    className="w-full sm:w-[300px]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleWebhookAdd(webhookDisplayName)} disabled={saving}>
                    Add Provider
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                </div>
              </div>
            )}

          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => { setShowAdd(true); setWebhookDisplayName(''); }}
          disabled={atLimit}
          title={atLimit ? 'Only one Resend provider is allowed' : undefined}
        >
          <Plus className="h-4 w-4" />
          {atLimit ? 'Provider already configured' : 'Add Resend Provider'}
        </Button>
      )}
    </div>
  );
}

// ── Inbox Tab ─────────────────────────────────────────────────────────────────

function InboxTab({ emails }: { emails: InboundEmail[] }) {
  if (emails.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">No inbound emails yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Once you connect an email provider and a customer emails you, activity will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-4 gap-y-2 rounded-lg border bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
        <span>Status</span>
        <span>Sender / Subject</span>
        <span>Language</span>
        <span>Received</span>
      </div>
      {emails.map((email) => (
        <div
          key={email.id}
          className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-4 gap-y-1 rounded-lg border bg-card px-4 py-3 hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center">{statusIcon(email.processing_status)}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {email.sender_name ? `${email.sender_name} <${email.sender_email}>` : email.sender_email}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {email.subject ?? '(no subject)'}
              {email.skip_reason && (
                <span className="ml-2 text-amber-600 dark:text-amber-400">· {email.skip_reason.replace(/_/g, ' ')}</span>
              )}
            </p>
          </div>
          <div className="text-xs text-muted-foreground">{languageName(email.detected_language)}</div>
          <div className="text-right">
            {statusBadge(email.processing_status)}
            <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(email.received_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function EmailAutomationClient({
  initialSettings,
  initialTemplates,
  initialProviders,
  initialInboundEmails,
  baseUrl,
}: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [templates, setTemplates] = useState(initialTemplates);
  const [providers, setProviders] = useState(initialProviders);
  const [inboundEmails] = useState(initialInboundEmails);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  }

  // ── OAuth callback handling ────────────────────────────────────────────────
  useEffect(() => {
    const connected = searchParams.get('provider_connected');
    const error = searchParams.get('provider_error');

    if (connected) {
      const labels: Record<string, string> = { gmail: 'Gmail', outlook: 'Outlook / Microsoft 365' };
      showToast(`${labels[connected] ?? connected} connected successfully. Reloading providers…`);
      // Refresh provider list from server
      fetch('/api/email-automation/providers')
        .then((r) => r.json())
        .then((d) => {
          if (d.providers) setProviders(d.providers);
        })
        .catch(() => {});
      // Clear the query params
      router.replace(pathname, { scroll: false });
    } else if (error) {
      showToast(decodeURIComponent(error), 'error');
      router.replace(pathname, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Settings save ──────────────────────────────────────────────────────────
  function handleSaveSettings(updates: Partial<EmailAutomationSettings>) {
    startTransition(async () => {
      try {
        const res = await fetch('/api/email-automation/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setSettings((prev) => ({ ...prev, ...data }));
        showToast('Settings saved.');
      } catch {
        showToast('Failed to save settings.', 'error');
      }
    });
  }

  // ── Template save ──────────────────────────────────────────────────────────
  function handleSaveTemplate(template: {
    language_code: string;
    language_name: string;
    subject_template: string;
    body_template: string;
    is_active: boolean;
  }) {
    startTransition(async () => {
      try {
        const res = await fetch('/api/email-automation/templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(template),
        });
        if (!res.ok) throw new Error(await res.text());
        const { template: saved } = await res.json();
        setTemplates((prev) => {
          const idx = prev.findIndex((t) => t.language_code === saved.language_code);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = saved;
            return next;
          }
          return [...prev, saved].sort((a, b) => a.language_code.localeCompare(b.language_code));
        });
        showToast('Template saved.');
      } catch {
        showToast('Failed to save template.', 'error');
      }
    });
  }

  // ── Template delete ────────────────────────────────────────────────────────
  function handleDeleteTemplate(languageCode: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/email-automation/templates?language_code=${languageCode}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error(await res.text());
        setTemplates((prev) => prev.filter((t) => t.language_code !== languageCode));
        showToast('Template deleted.');
      } catch {
        showToast('Failed to delete template.', 'error');
      }
    });
  }

  // ── Provider add ───────────────────────────────────────────────────────────
  function handleAddProvider(body: Record<string, unknown>) {
    startTransition(async () => {
      try {
        const res = await fetch('/api/email-automation/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unknown error' }));
          const smtpErr = err.smtp_error ? ` SMTP: ${err.smtp_error}` : '';
          const imapErr = err.imap_error ? ` IMAP: ${err.imap_error}` : '';
          throw new Error((err.error ?? 'Failed to add provider') + smtpErr + imapErr);
        }
        const { provider } = await res.json();
        setProviders((prev) => [...prev, provider]);
        showToast('Provider added successfully.');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to add provider.', 'error');
      }
    });
  }

  // ── Provider delete ────────────────────────────────────────────────────────
  function handleDeleteProvider(providerId: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/email-automation/providers?id=${providerId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(await res.text());
        setProviders((prev) => prev.filter((p) => p.id !== providerId));
        showToast('Provider removed.');
      } catch {
        showToast('Failed to remove provider.', 'error');
      }
    });
  }

  // ── Provider test connection ───────────────────────────────────────────────
  function handleTestProvider(providerId: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/email-automation/providers/test?id=${providerId}`, { method: 'POST' });
        const data = await res.json();
        if (data.ok) {
          setProviders((prev) =>
            prev.map((p) =>
              p.id === providerId
                ? { ...p, status: 'connected' as const, status_message: null, last_verified_at: new Date().toISOString() }
                : p
            )
          );
          showToast('Connection test passed.');
        } else {
          setProviders((prev) =>
            prev.map((p) =>
              p.id === providerId ? { ...p, status: 'error' as const, status_message: data.error ?? 'Test failed' } : p
            )
          );
          showToast(data.error ?? 'Connection test failed.', 'error');
        }
      } catch {
        showToast('Could not reach test endpoint.', 'error');
      }
    });
  }

  // ── Provider reconnect (OAuth) ─────────────────────────────────────────────
  function handleReconnectProvider(provider: EmailProvider) {
    const oauthPath =
      provider.provider_type === 'gmail'
        ? '/api/email-automation/providers/google/start'
        : '/api/email-automation/providers/microsoft/start';
    const returnTo = pathname;
    window.location.href = `${oauthPath}?returnTo=${encodeURIComponent(returnTo)}&reconnect=${provider.id}`;
  }

  // ── Provider set default ───────────────────────────────────────────────────
  function handleSetDefault(providerId: string) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/email-automation/providers?id=${providerId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_default: true }),
        });
        if (!res.ok) throw new Error('Failed to update provider');
        setProviders((prev) =>
          prev.map((p) => ({ ...p, is_default: p.id === providerId }))
        );
        showToast('Default provider updated.');
      } catch {
        showToast('Failed to update default provider.', 'error');
      }
    });
  }

  // ── Provider enable / disable ──────────────────────────────────────────────
  function handleToggleDisabled(provider: EmailProvider) {
    const newStatus = provider.status === 'disabled' ? 'connected' : 'disabled';
    startTransition(async () => {
      try {
        const res = await fetch(`/api/email-automation/providers?id=${provider.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error('Failed to update provider');
        setProviders((prev) =>
          prev.map((p) => (p.id === provider.id ? { ...p, status: newStatus } : p))
        );
        showToast(newStatus === 'disabled' ? 'Provider disabled.' : 'Provider enabled.');
      } catch {
        showToast('Failed to update provider.', 'error');
      }
    });
  }

  const repliedCount = inboundEmails.filter((e) => e.processing_status === 'replied').length;
  const totalCount = inboundEmails.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Auto Replies</h1>
          <p className="text-muted-foreground">
            Automatically reply to incoming customer emails in their detected language.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${
            settings.enabled
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
              : 'border-border bg-muted/60 text-muted-foreground'
          }`}>
            <span className={`h-2 w-2 rounded-full ${settings.enabled ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
            {settings.enabled ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>

      {/* Stats row */}
      {totalCount > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Total Received</p>
            <p className="mt-1 text-2xl font-bold">{totalCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Replied</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{repliedCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Skipped / Filtered</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {inboundEmails.filter((e) => e.processing_status === 'skipped').length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Reply Rate</p>
            <p className="mt-1 text-2xl font-bold">
              {totalCount > 0 ? `${Math.round((repliedCount / totalCount) * 100)}%` : '—'}
            </p>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-flex">
          <TabsTrigger value="settings" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <Languages className="h-3.5 w-3.5" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="providers" className="gap-1.5">
            <Plug className="h-3.5 w-3.5" />
            Provider
          </TabsTrigger>
          <TabsTrigger value="inbox" className="gap-1.5">
            <Inbox className="h-3.5 w-3.5" />
            Inbox
            {inboundEmails.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
                {inboundEmails.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <SettingsTab settings={settings} onSave={handleSaveSettings} saving={isPending} />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesTab
            templates={templates}
            onSave={handleSaveTemplate}
            onDelete={handleDeleteTemplate}
            saving={isPending}
          />
        </TabsContent>

        <TabsContent value="providers">
          <ProvidersTab
            providers={providers}
            baseUrl={baseUrl}
            onAdd={handleAddProvider}
            onDelete={handleDeleteProvider}
            onTest={handleTestProvider}
            onReconnect={handleReconnectProvider}
            onSetDefault={handleSetDefault}
            onToggleDisabled={handleToggleDisabled}
            saving={isPending}
          />
        </TabsContent>

        <TabsContent value="inbox">
          <InboxTab emails={inboundEmails} />
        </TabsContent>
      </Tabs>

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 shadow-lg text-sm font-medium transition-all ${
            toast.type === 'error'
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-card dark:text-emerald-300'
          }`}
        >
          {toast.type === 'error' ? (
            <XCircle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}
