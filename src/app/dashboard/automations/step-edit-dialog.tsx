'use client';

import { useState, useEffect } from 'react';
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
import { getStepTypeLabel, getActionLabel } from '@/lib/automations/labels';
import { ACTION_TYPES } from '@/lib/automations/types';

export type AutomationStepRecord = {
  id: string;
  automation_id: string;
  step_order: number;
  step_type: string;
  step_name: string | null;
  config_json: Record<string, unknown>;
  condition_json: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

type Props = {
  open: boolean;
  step: AutomationStepRecord | null;
  onClose: () => void;
  onSave: (updated: AutomationStepRecord) => void;
};

export function StepEditDialog({ open, step, onClose, onSave }: Props) {
  const [stepName, setStepName] = useState('');
  const [delaySeconds, setDelaySeconds] = useState<number>(0);
  const [conditionPath, setConditionPath] = useState('');
  const [conditionValue, setConditionValue] = useState('');
  const [actionType, setActionType] = useState<string>('send_email_notification');
  const [actionToEmail, setActionToEmail] = useState('');
  const [actionUrl, setActionUrl] = useState('');

  useEffect(() => {
    if (!step) return;
    setStepName(step.step_name ?? '');
    const cfg = step.config_json ?? {};
    const actionConfig = (cfg.action_config as Record<string, unknown>) ?? {};
    setDelaySeconds(typeof cfg.delay_seconds === 'number' ? cfg.delay_seconds : 0);
    const cond = step.condition_json ?? {};
    setConditionPath(typeof cond.path === 'string' ? cond.path : '');
    setConditionValue(cond.value != null ? String(cond.value) : '');
    setActionType(typeof cfg.action_type === 'string' ? cfg.action_type : 'send_email_notification');
    setActionToEmail(typeof actionConfig.to_email === 'string' ? actionConfig.to_email : '');
    setActionUrl(typeof actionConfig.url === 'string' ? actionConfig.url : '');
  }, [step]);

  if (!step) return null;

  const handleSave = () => {
    const updated: AutomationStepRecord = { ...step };
    updated.step_name = stepName.trim() || null;

    if (step.step_type === 'delay') {
      updated.config_json = { ...step.config_json, delay_seconds: Math.max(0, Math.min(300, delaySeconds)) };
    } else if (step.step_type === 'branch_if') {
      updated.condition_json = {
        path: conditionPath.trim() || 'lead.email',
        value: conditionValue.trim() || undefined,
      };
    } else if (step.step_type === 'action') {
      const actionConfig: Record<string, unknown> =
        actionType === 'send_email_notification'
          ? { to_email: actionToEmail.trim() || undefined }
          : actionType === 'call_webhook' || actionType === 'call_external_url'
            ? { url: actionUrl.trim() || undefined }
            : {};
      updated.config_json = {
        ...step.config_json,
        action_type: actionType,
        action_config: actionConfig,
      };
    }

    onSave(updated);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md" showClose>
        <DialogHeader>
          <DialogTitle>Edit step</DialogTitle>
          <DialogDescription>
            {getStepTypeLabel(step.step_type)} — configure name and options.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="step-name">Step name (optional)</Label>
            <Input
              id="step-name"
              value={stepName}
              onChange={(e) => setStepName(e.target.value)}
              placeholder={getStepTypeLabel(step.step_type)}
              className="mt-1"
            />
          </div>

          {step.step_type === 'delay' && (
            <div>
              <Label htmlFor="delay-seconds">Delay (seconds)</Label>
              <Input
                id="delay-seconds"
                type="number"
                min={0}
                max={300}
                value={delaySeconds || ''}
                onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10) || 0)}
                placeholder="0"
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">Max 300 seconds (5 minutes).</p>
            </div>
          )}

          {step.step_type === 'branch_if' && (
            <>
              <div>
                <Label htmlFor="cond-path">Input path (e.g. lead.email)</Label>
                <Input
                  id="cond-path"
                  value={conditionPath}
                  onChange={(e) => setConditionPath(e.target.value)}
                  placeholder="lead.email"
                  className="mt-1 font-mono text-sm"
                />
              </div>
              <div>
                <Label htmlFor="cond-value">Expected value (equals)</Label>
                <Input
                  id="cond-value"
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  placeholder="value"
                  className="mt-1"
                />
              </div>
            </>
          )}

          {step.step_type === 'action' && (
            <>
              <div>
                <Label htmlFor="action-type">Action type</Label>
                <select
                  id="action-type"
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
                  <Label htmlFor="action-email">Notification email (optional)</Label>
                  <Input
                    id="action-email"
                    type="email"
                    value={actionToEmail}
                    onChange={(e) => setActionToEmail(e.target.value)}
                    placeholder="Leave empty to use default"
                    className="mt-1"
                  />
                </div>
              )}
              {(actionType === 'call_webhook' || actionType === 'call_external_url') && (
                <div>
                  <Label htmlFor="action-url">Webhook URL</Label>
                  <Input
                    id="action-url"
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-1 font-mono text-sm"
                  />
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
