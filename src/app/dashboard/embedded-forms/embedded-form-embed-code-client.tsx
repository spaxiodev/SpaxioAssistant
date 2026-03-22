'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Copy, Check, ExternalLink, AlertCircle } from 'lucide-react';
import type { ThemeMode } from '@/lib/embedded-forms/types';

type Props = {
  formId: string;
  formName: string;
  isActive: boolean;
  baseUrl: string;
};

function buildEmbedCode(formId: string, theme: ThemeMode, baseUrl: string): string {
  const containerId = `spaxio-form-${formId}`;
  return `<div id="${containerId}"></div>
<script src="${baseUrl}/embed/form.js"
        data-form-id="${formId}"
        data-container="#${containerId}"
        data-theme="${theme}"></script>`;
}

export function EmbeddedFormEmbedCodeClient({ formId, formName, isActive, baseUrl }: Props) {
  const [theme, setTheme] = useState<ThemeMode>('auto');
  const [copied, setCopied] = useState(false);

  const embedCode = buildEmbedCode(formId, theme, baseUrl);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = embedCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-6">
      {!isActive && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Form is inactive</p>
            <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-500">
              This form is currently inactive. Visitors who encounter the embed code will see an error. Activate the form in the Builder tab.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Embed Code</CardTitle>
          <CardDescription>
            Paste this snippet anywhere in your website HTML, just before the closing{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">&lt;/body&gt;</code> tag.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div>
              <Label htmlFor="embed-theme">Theme</Label>
              <Select value={theme} onValueChange={(v) => setTheme(v as ThemeMode)}>
                <SelectTrigger id="embed-theme" className="mt-1 w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (detect)</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <Badge variant={isActive ? 'default' : 'secondary'} className={isActive ? 'bg-green-600 hover:bg-green-700' : ''}>
                {isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          <div className="relative rounded-lg border bg-muted/40">
            <pre className="overflow-x-auto p-4 text-xs font-mono text-foreground/80 whitespace-pre">
              {embedCode}
            </pre>
            <Button
              size="sm"
              variant="outline"
              className="absolute right-3 top-3"
              onClick={handleCopy}
            >
              {copied ? (
                <><Check className="mr-1.5 h-3.5 w-3.5 text-green-600" />Copied!</>
              ) : (
                <><Copy className="mr-1.5 h-3.5 w-3.5" />Copy code</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How to install</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <ol className="space-y-3 list-decimal list-inside">
            <li>
              <span className="text-foreground font-medium">Copy the embed code</span> above using the button.
            </li>
            <li>
              <span className="text-foreground font-medium">Open your website editor</span> — WordPress, Webflow, Squarespace, or any HTML file.
            </li>
            <li>
              <span className="text-foreground font-medium">Paste the code</span> into the page where you want the form to appear, inside the{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono text-foreground">{'<body>'}</code>.
            </li>
            <li>
              <span className="text-foreground font-medium">Save and publish</span> your page. The form will load automatically.
            </li>
          </ol>

          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="font-medium text-foreground">Testing tip</p>
            <p className="mt-1">
              You can test the form API directly at{' '}
              <a
                href={`${baseUrl}/api/embed/form/${formId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                /api/embed/form/{formId.slice(0, 8)}…
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
