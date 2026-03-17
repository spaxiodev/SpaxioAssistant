'use client';

import { useState, useEffect } from 'react';
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
import { useToast } from '@/components/ui/use-toast';
import { Copy, RefreshCw, Workflow } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AUTOMATION_TEMPLATES, getTemplateByKey } from '@/lib/automations/templates';
import { TRIGGER_TYPES, ACTION_TYPES } from '@/lib/automations/types';
import { getTriggerLabel, getActionLabel } from '@/lib/automations/labels';
import type { Automation } from '@/lib/supabase/database.types';
import { AutomationWorkflowEditor } from './automation-workflow-editor';
import { useViewMode } from '@/contexts/view-mode-context';

const WEBHOOK_SAMPLE_PAYLOAD = `{
  "event": "order.created",
  "data": { "id": "123", "amount": 99.99 }
}`;

type AgentOption = { id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialTemplateKey?: string | null;
  editAutomation?: Automation | null;
  agents: AgentOption[];
};

export function CreateAutomationModal({
  open,
  onClose,
  onSuccess,
  initialTemplateKey,
  editAutomation,
  agents,
}: Props) {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [templateKey, setTemplateKey] = useState<string>('');
  const [agentId, setAgentId] = useState<string>('');
  const [triggerType, setTriggerType] = useState<string>('manual_test');
  const [actionType, setActionType] = useState<string>('send_email_notification');
  const [status, setStatus] = useState<'draft' | 'active' | 'paused'>('draft');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [showCreatedSuccess, setShowCreatedSuccess] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'workflow'>('details');
  const { mode } = useViewMode();

  const isEdit = !!editAutomation?.id;
  const automationWithWebhook = editAutomation as (Automation & { webhook_url?: string }) | null;

  useEffect(() => {
    if (!open) return;
    setShowCreatedSuccess(false);
    if (editAutomation) {
      setName(editAutomation.name);
      setDescription(editAutomation.description ?? '');
      setTemplateKey(editAutomation.template_key ?? '');
      setAgentId(editAutomation.agent_id ?? '');
      setTriggerType(editAutomation.trigger_type);
      setActionType(editAutomation.action_type);
      setStatus(editAutomation.status as 'draft' | 'active' | 'paused');
      setWebhookUrl(automationWithWebhook?.webhook_url ?? '');
      const config = (editAutomation.action_config as Record<string, unknown>) ?? {};
      setNotificationEmail(typeof config.to_email === 'string' ? config.to_email : '');
    } else if (initialTemplateKey) {
      const template = getTemplateByKey(initialTemplateKey);
      if (template) {
        setTemplateKey(template.key);
        setName(template.title);
        setDescription(template.description);
        setTriggerType(template.trigger_type);
        setActionType(template.action_type);
        setAgentId('');
        setStatus('draft');
      }
    } else {
      setName('');
      setDescription('');
      setTemplateKey('');
      setAgentId('');
      setTriggerType('manual_test');
      setActionType('send_email_notification');
      setStatus('draft');
      setNotificationEmail('');
      setWebhookUrl('');
    }
  }, [open, editAutomation, initialTemplateKey, automationWithWebhook?.webhook_url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const actionConfig: Record<string, unknown> =
        (isEdit && editAutomation?.action_config && typeof editAutomation.action_config === 'object'
          ? { ...(editAutomation.action_config as Record<string, unknown>) }
          : {});
      if (actionType === 'send_email_notification') {
        actionConfig.to_email = notificationEmail.trim() || undefined;
      }
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        template_key: templateKey || null,
        agent_id: agentId || null,
        trigger_type: triggerType,
        trigger_config: {},
        action_type: actionType,
        action_config: actionConfig,
        status,
      };
      if (isEdit) {
        const res = await fetch(`/api/automations/${editAutomation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast({ title: 'Error', description: data.error ?? 'Failed to update', variant: 'destructive' });
          return;
        }
        toast({ title: 'Automation updated' });
        if (triggerType === 'webhook_received' && (data as { webhook_url?: string }).webhook_url) {
          setWebhookUrl((data as { webhook_url: string }).webhook_url);
        }
      } else {
        const res = await fetch('/api/automations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast({
            title: 'Error',
            description: data.message ?? data.error ?? 'Failed to create',
            variant: 'destructive',
          });
          return;
        }
        toast({ title: 'Automation created' });
        if (triggerType === 'webhook_received' && (data as { webhook_url?: string }).webhook_url) {
          setWebhookUrl((data as { webhook_url: string }).webhook_url);
          setShowCreatedSuccess(true);
          router.refresh();
          return;
        }
      }
      onSuccess?.();
      onClose();
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const visibleTemplates = AUTOMATION_TEMPLATES.filter((tmpl) =>
    mode === 'simple' ? tmpl.visible_in_simple_mode : tmpl.visible_in_developer_mode
  );

  const handleTemplateChange = (key: string) => {
    setTemplateKey(key);
    const template = getTemplateByKey(key);
    if (template) {
      setName(template.title);
      setDescription(template.description);
      setTriggerType(template.trigger_type);
      setActionType(template.action_type);
    }
  };

  const handleCopyWebhookUrl = () => {
    const url = webhookUrl || (automationWithWebhook?.webhook_url ?? '');
    if (!url) return;
    navigator.clipboard.writeText(url).then(
      () => toast({ title: 'Copied to clipboard' }),
      () => toast({ title: 'Copy failed', variant: 'destructive' })
    );
  };

  const handleCopySamplePayload = () => {
    navigator.clipboard.writeText(WEBHOOK_SAMPLE_PAYLOAD).then(
      () => toast({ title: 'Sample payload copied' }),
      () => toast({ title: 'Copy failed', variant: 'destructive' })
    );
  };

  const handleRegenerateWebhook = async () => {
    if (!editAutomation?.id) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/automations/${editAutomation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate_webhook: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Error', description: data.error ?? 'Failed to regenerate', variant: 'destructive' });
        return;
      }
      const url = (data as { webhook_url?: string }).webhook_url;
      if (url) setWebhookUrl(url);
      toast({ title: 'Webhook URL regenerated' });
      router.refresh();
    } finally {
      setRegenerating(false);
    }
  };

  const displayWebhookUrl = (webhookUrl || (isEdit ? automationWithWebhook?.webhook_url : null)) ?? '';

  if (!open) return null;

  if (showCreatedSuccess && webhookUrl) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && (onSuccess?.(), onClose())}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg" showClose>
          <DialogHeader>
            <DialogTitle>Automation created</DialogTitle>
            <DialogDescription>
              Use the webhook URL below to trigger this automation from external systems.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pt-2">
            <div>
              <Label className="text-sm font-medium">Webhook URL</Label>
              <div className="mt-1 flex gap-2">
                <Input readOnly value={webhookUrl} className="font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={handleCopyWebhookUrl} title="Copy URL">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Sample payload (POST JSON body)</Label>
              <pre className="mt-1 max-h-32 overflow-auto rounded border border-border/50 bg-background p-2 text-xs">
                {WEBHOOK_SAMPLE_PAYLOAD}
              </pre>
              <Button type="button" variant="ghost" size="sm" className="mt-1" onClick={handleCopySamplePayload}>
                <Copy className="mr-1 h-3 w-3" />
                Copy sample
              </Button>
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                onClick={() => {
                  onSuccess?.();
                  onClose();
                  router.refresh();
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={`flex max-h-[90vh] flex-col overflow-hidden ${isEdit && activeTab === 'workflow' ? 'sm:max-w-4xl' : 'sm:max-w-lg'}`}
        showClose
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEdit ? t('editAutomationTitle') : t('createAutomationTitle')}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update trigger, action, and build your workflow with blocks.'
              : 'Choose a template or configure from scratch.'}
          </DialogDescription>
        </DialogHeader>
        {isEdit ? (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'details' | 'workflow')} className="flex min-h-0 flex-1 flex-col">
            <TabsList className="shrink-0">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="workflow">
                <Workflow className="mr-2 h-4 w-4" />
                Workflow
              </TabsTrigger>
            </TabsList>
            <TabsContent value="details" className="mt-3 min-h-0 flex-1 overflow-y-auto">
              <form onSubmit={handleSubmit} className="flex flex-col">
                <div className="space-y-4 pt-2 pr-1">
          <div>
            <Label htmlFor="automation-name">{t('automationNameLabel')}</Label>
            <Input
              id="automation-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('automationNamePlaceholder')}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="automation-desc">{t('automationDescriptionLabel')}</Label>
            <Input
              id="automation-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
            />
          </div>
          {!isEdit && (
            <div>
              <Label htmlFor="automation-template">{t('selectTemplate')}</Label>
              <select
                id="automation-template"
                value={templateKey}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">From scratch</option>
                {visibleTemplates.map((tmpl) => (
                  <option key={tmpl.key} value={tmpl.key}>
                    {tmpl.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <Label htmlFor="automation-agent">{t('selectAgent')}</Label>
            <select
              id="automation-agent"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">{t('noAgent')}</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="automation-trigger">{t('triggerType')}</Label>
            <select
              id="automation-trigger"
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {TRIGGER_TYPES.map((tt) => (
                <option key={tt} value={tt}>
                  {getTriggerLabel(tt)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="automation-action">{t('actionType')}</Label>
            <select
              id="automation-action"
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {ACTION_TYPES.map((at) => (
                <option key={at} value={at}>
                  {getActionLabel(at)}
                </option>
              ))}
            </select>
          </div>
          {actionType === 'send_email_notification' && (
            <div>
              <Label htmlFor="automation-to-email">Notification email (optional)</Label>
              <Input
                id="automation-to-email"
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="Leave empty to use Contact / Lead email from Settings"
                className="mt-1"
              />
            </div>
          )}
          <div>
            <Label htmlFor="automation-status">Status</Label>
            <select
              id="automation-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'draft' | 'active' | 'paused')}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="draft">{t('automationStatusDraft')}</option>
              <option value="active">{t('automationStatusActive')}</option>
              <option value="paused">{t('automationStatusPaused')}</option>
            </select>
          </div>
          {triggerType === 'webhook_received' && (
            <div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-3">
              <Label className="text-sm font-medium">Webhook URL</Label>
              {displayWebhookUrl ? (
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={displayWebhookUrl}
                    className="font-mono text-xs"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={handleCopyWebhookUrl} title="Copy URL">
                    <Copy className="h-4 w-4" />
                  </Button>
                  {isEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleRegenerateWebhook}
                      disabled={regenerating}
                      title="Regenerate webhook URL"
                    >
                      <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Save the automation to generate your webhook URL.</p>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Sample payload (POST JSON body)</Label>
                <pre className="mt-1 max-h-32 overflow-auto rounded border border-border/50 bg-background p-2 text-xs">
                  {WEBHOOK_SAMPLE_PAYLOAD}
                </pre>
                <Button type="button" variant="ghost" size="sm" className="mt-1" onClick={handleCopySamplePayload}>
                  <Copy className="mr-1 h-3 w-3" />
                  Copy sample
                </Button>
              </div>
            </div>
          )}
                </div>
                <DialogFooter className="shrink-0 gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={onClose}>
                    {t('cancel')}
                  </Button>
                  <Button type="submit" disabled={loading || !name.trim()}>
                    {loading ? '…' : t('save')}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
            <TabsContent value="workflow" className="mt-3 min-h-0 flex-1 overflow-hidden data-[state=inactive]:hidden">
              {editAutomation && (
                <AutomationWorkflowEditor
                  automationId={editAutomation.id}
                  triggerType={triggerType}
                />
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pt-2 pr-1">
          <div>
            <Label htmlFor="automation-name">{t('automationNameLabel')}</Label>
            <Input
              id="automation-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('automationNamePlaceholder')}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="automation-desc">{t('automationDescriptionLabel')}</Label>
            <Input
              id="automation-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
            />
          </div>
          {!isEdit && (
            <div>
              <Label htmlFor="automation-template">{t('selectTemplate')}</Label>
              <select
                id="automation-template"
                value={templateKey}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">From scratch</option>
                {visibleTemplates.map((tmpl) => (
                  <option key={tmpl.key} value={tmpl.key}>
                    {tmpl.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <Label htmlFor="automation-agent">{t('selectAgent')}</Label>
            <select
              id="automation-agent"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">{t('noAgent')}</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="automation-trigger">{t('triggerType')}</Label>
            <select
              id="automation-trigger"
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {TRIGGER_TYPES.map((tt) => (
                <option key={tt} value={tt}>
                  {getTriggerLabel(tt)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="automation-action">{t('actionType')}</Label>
            <select
              id="automation-action"
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {ACTION_TYPES.map((at) => (
                <option key={at} value={at}>
                  {getActionLabel(at)}
                </option>
              ))}
            </select>
          </div>
          {actionType === 'send_email_notification' && (
            <div>
              <Label htmlFor="automation-to-email">Notification email (optional)</Label>
              <Input
                id="automation-to-email"
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="Leave empty to use Contact / Lead email from Settings"
                className="mt-1"
              />
            </div>
          )}
          <div>
            <Label htmlFor="automation-status">Status</Label>
            <select
              id="automation-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'draft' | 'active' | 'paused')}
              className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="draft">{t('automationStatusDraft')}</option>
              <option value="active">{t('automationStatusActive')}</option>
              <option value="paused">{t('automationStatusPaused')}</option>
            </select>
          </div>
          {triggerType === 'webhook_received' && (
            <div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-3">
              <Label className="text-sm font-medium">Webhook URL</Label>
              {displayWebhookUrl ? (
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={displayWebhookUrl}
                    className="font-mono text-xs"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={handleCopyWebhookUrl} title="Copy URL">
                    <Copy className="h-4 w-4" />
                  </Button>
                  {isEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleRegenerateWebhook}
                      disabled={regenerating}
                      title="Regenerate webhook URL"
                    >
                      <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Save the automation to generate your webhook URL.</p>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Sample payload (POST JSON body)</Label>
                <pre className="mt-1 max-h-32 overflow-auto rounded border border-border/50 bg-background p-2 text-xs">
                  {WEBHOOK_SAMPLE_PAYLOAD}
                </pre>
                <Button type="button" variant="ghost" size="sm" className="mt-1" onClick={handleCopySamplePayload}>
                  <Copy className="mr-1 h-3 w-3" />
                  Copy sample
                </Button>
              </div>
            </div>
          )}
          </div>
          <DialogFooter className="shrink-0 gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? '…' : t('save')}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
