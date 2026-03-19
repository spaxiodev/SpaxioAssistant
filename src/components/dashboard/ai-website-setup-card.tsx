'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Globe, CheckCircle2, AlertCircle } from 'lucide-react';

const STEPS: Record<string, string> = {
  pending: 'Starting…',
  scanning: 'Scanning your website…',
  building_knowledge: 'Building your knowledge base…',
  creating_agents: 'Creating your assistant…',
  creating_automations: 'Setting up automations…',
  configuring_widget: 'Configuring your chat widget…',
  done: 'Done!',
  failed: 'Something went wrong',
};

export function AiWebsiteSetupCard() {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [step, setStep] = useState<string | null>(null);
  const [currentStepLabel, setCurrentStepLabel] = useState<string | null>(null);
  const [status, setStatus] = useState<'running' | 'completed' | 'failed' | null>(null);
  const [result, setResult] = useState<{
    businessSettingsUpdated?: boolean;
    knowledgeSourceId?: string;
    knowledgeChunksCreated?: number;
    agentIds?: string[];
    automationIds?: string[];
    widgetConfigured?: boolean;
    error?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStart = async () => {
    const url = websiteUrl.trim();
    if (!url || !url.startsWith('http')) {
      setErrorMessage('Please enter a valid website URL (e.g. https://example.com)');
      return;
    }
    setErrorMessage(null);
    setLoading(true);
    setStatus('running');
    setStep('pending');
    setResult(null);
    try {
      const startRes = await fetch('/api/website-auto-setup/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website_url: url,
          business_type: businessType.trim() || undefined,
          business_description: description.trim() || undefined,
        }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) {
        setStatus('failed');
        setErrorMessage(startData.error || 'Failed to start setup');
        return;
      }
      const rid = startData.run_id;
      setRunId(rid);
      const poll = async () => {
        const statusRes = await fetch(`/api/website-auto-setup/status/${rid}`);
        const statusData = await statusRes.json();
        if (!statusRes.ok) {
          setStatus('failed');
          setErrorMessage(statusData.error || 'Could not get status');
          setLoading(false);
          return;
        }
        setStep(statusData.status);
        setCurrentStepLabel((statusData as { current_step?: string }).current_step ?? null);
        setStatus(statusData.status === 'done' ? 'completed' : statusData.status === 'failed' ? 'failed' : 'running');
        if (statusData.error_message) setErrorMessage(statusData.error_message);
        if (statusData.result_summary) {
          const r = statusData.result_summary as {
            business_name?: string;
            knowledge_source_id?: string;
            agent_ids?: string[];
            automation_ids?: string[];
            widget_updated?: boolean;
          };
          setResult({
            businessSettingsUpdated: !!r.business_name,
            knowledgeSourceId: r.knowledge_source_id,
            agentIds: r.agent_ids,
            automationIds: r.automation_ids,
            widgetConfigured: r.widget_updated,
          });
        }
        if (statusData.status === 'done' || statusData.status === 'failed') {
          setLoading(false);
          return;
        }
        setTimeout(poll, 2000);
      };
      await poll();
    } catch (e) {
      setStatus('failed');
      setErrorMessage(e instanceof Error ? e.message : 'Request failed');
      setLoading(false);
    }
  };

  const stepLabel = step ? STEPS[step] || step : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="h-5 w-5" />
          Set up from your website
        </CardTitle>
        <CardDescription>
          Enter your website URL. We&apos;ll scan it, learn your business, and configure your assistant—including what it knows and how it follows up with visitors.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status !== 'completed' && status !== 'failed' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="website-url">Website URL *</Label>
              <Input
                id="website-url"
                type="url"
                placeholder="https://yourbusiness.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business-type">Business type (optional)</Label>
              <Input
                id="business-type"
                placeholder="e.g. Plumbing, Law firm, Restaurant"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Short description (optional)</Label>
              <Textarea
                id="description"
                placeholder="One line about what you do"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                disabled={loading}
              />
            </div>
          </>
        )}

        {loading && (currentStepLabel || stepLabel || step) && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3 text-sm">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span>{currentStepLabel ?? stepLabel ?? (step === 'pending' ? 'Starting…' : String(step))}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {status === 'completed' && result && (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              Setup complete
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {result.businessSettingsUpdated && <li>• Business info updated</li>}
              {result.knowledgeSourceId && (
                <li>• Website info added ({result.knowledgeChunksCreated ?? 0} items)</li>
              )}
              {result.agentIds && result.agentIds.length > 0 && (
                <li>• AI assistant created</li>
              )}
              {result.automationIds && result.automationIds.length > 0 && (
                <li>• Auto follow-up configured</li>
              )}
              {result.widgetConfigured && <li>• Chat widget ready</li>}
            </ul>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatus(null);
                setStep(null);
                setResult(null);
                setErrorMessage(null);
              }}
            >
              Run again
            </Button>
          </div>
        )}

        {status !== 'completed' && !loading && (
          <Button onClick={handleStart} disabled={!websiteUrl.trim()}>
            Start setup
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
