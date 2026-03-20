'use client';

import { useState, useTransition } from 'react';
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
  { value: 'webhook_inbound', label: 'Webhook (Universal)', description: 'Works with any email provider via webhook' },
  { value: 'resend', label: 'Resend Inbound', description: 'Use Resend inbound routing' },
  { value: 'gmail', label: 'Gmail / Google Workspace', description: 'Coming soon' },
  { value: 'outlook', label: 'Outlook / Microsoft 365', description: 'Coming soon' },
  { value: 'imap', label: 'IMAP / Custom', description: 'Coming soon' },
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

// ── Providers Tab ─────────────────────────────────────────────────────────────

function ProvidersTab({
  providers,
  baseUrl,
  onAdd,
  onDelete,
  saving,
}: {
  providers: EmailProvider[];
  baseUrl: string;
  onAdd: (providerType: string, displayName: string) => void;
  onDelete: (providerId: string) => void;
  saving: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState('webhook_inbound');
  const [displayName, setDisplayName] = useState('');

  function handleAdd() {
    onAdd(addType, displayName);
    setShowAdd(false);
    setAddType('webhook_inbound');
    setDisplayName('');
  }

  const comingSoon = new Set(['gmail', 'outlook', 'imap']);

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Plug className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-medium">How inbound email works</p>
              <p className="mt-1 text-muted-foreground">
                Connect an email provider so Spaxio can receive incoming emails. Use the <strong>Webhook</strong> option to route emails from any provider (Gmail, Outlook, Mailgun, Postmark, etc.) via a webhook URL. Native Gmail and Outlook integrations are coming soon.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {providers.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <Mail className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No email provider connected yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">Add a provider to start receiving inbound emails.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {providers.map((provider) => {
          const webhookUrl = provider.inbound_webhook_token
            ? `${baseUrl}/api/email-automation/inbound/webhook?token=${provider.inbound_webhook_token}`
            : null;
          return (
            <Card key={provider.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">
                      {provider.display_name ?? PROVIDER_OPTIONS.find((p) => p.value === provider.provider_type)?.label ?? provider.provider_type}
                    </CardTitle>
                    <Badge
                      className={
                        provider.status === 'connected'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 text-xs'
                          : provider.status === 'error'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-0 text-xs'
                            : 'border-0 text-xs bg-muted text-muted-foreground'
                      }
                    >
                      {provider.status === 'connected' ? 'Connected' : provider.status === 'error' ? 'Error' : 'Disconnected'}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(provider.id)}
                    disabled={saving}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              {webhookUrl && (
                <CardContent className="pt-0 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Inbound Webhook URL</p>
                  <p className="text-xs text-muted-foreground mb-1">
                    Configure your email provider to forward inbound emails as JSON POST requests to this URL.
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
            </Card>
          );
        })}
      </div>

      {showAdd ? (
        <Card className="border-dashed border-primary/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add Email Provider</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-1.5">
              <Label>Provider Type</Label>
              <div className="grid gap-2">
                {PROVIDER_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    disabled={comingSoon.has(p.value)}
                    onClick={() => !comingSoon.has(p.value) && setAddType(p.value)}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-all ${
                      addType === p.value
                        ? 'border-primary bg-primary/5 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.4)]'
                        : comingSoon.has(p.value)
                          ? 'cursor-not-allowed opacity-50'
                          : 'hover:bg-muted/50'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium">{p.label}</div>
                      <div className="text-xs text-muted-foreground">{p.description}</div>
                    </div>
                    {comingSoon.has(p.value) && (
                      <Badge variant="secondary" className="text-xs shrink-0 ml-2">Soon</Badge>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="display_name">Display Name (optional)</Label>
              <Input
                id="display_name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. support@yourcompany.com"
                className="w-full sm:w-[300px]"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving}>Add Provider</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => setShowAdd(true)}
          disabled={providers.length >= 3}
        >
          <Plus className="h-4 w-4" />
          Add Email Provider
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

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

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
  function handleAddProvider(providerType: string, displayName: string) {
    startTransition(async () => {
      try {
        const res = await fetch('/api/email-automation/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider_type: providerType, display_name: displayName || null }),
        });
        if (!res.ok) throw new Error(await res.text());
        const { provider } = await res.json();
        setProviders((prev) => [...prev, provider]);
        showToast('Provider added.');
      } catch {
        showToast('Failed to add provider.', 'error');
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
