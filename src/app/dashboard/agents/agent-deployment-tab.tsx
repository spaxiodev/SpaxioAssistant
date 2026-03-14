'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Link } from '@/i18n/navigation';
import { Copy } from 'lucide-react';

export function AgentDeploymentTab({
  widgetEnabled,
}: {
  agentId: string;
  agentName: string;
  widgetEnabled: boolean;
}) {
  const [scriptTag, setScriptTag] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    setScriptTag(`<script src="${origin}/widget.js" data-widget-id="YOUR_WIDGET_ID"></script>`);
  }, []);

  function copyEmbed() {
    if (!scriptTag) return;
    navigator.clipboard.writeText(scriptTag);
    toast({ title: 'Copied', description: 'Embed code copied to clipboard.' });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deployment</CardTitle>
        <CardDescription>Website widget, embed, and deployment options.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!widgetEnabled && (
          <p className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
            Enable &quot;Available for website widget&quot; in Overview for this agent to appear in the widget.
          </p>
        )}
        <div>
          <h4 className="mb-2 text-sm font-medium">Website embed</h4>
          <p className="mb-2 text-xs text-muted-foreground">
            Add this script to your site. Replace YOUR_WIDGET_ID with your widget ID from the Install page. Configure branding and which agent is used there.
          </p>
          <pre className="rounded-md border border-border bg-muted/50 p-3 text-xs font-mono break-all">
            {scriptTag || 'Loading…'}
          </pre>
          <Button variant="outline" size="sm" className="mt-2" onClick={copyEmbed} disabled={!scriptTag}>
            <Copy className="mr-2 h-4 w-4" />
            Copy embed code
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          <Link href="/dashboard/install" className="text-primary underline underline-offset-2">
            Go to Install &amp; Deployments
          </Link>
          {' '}to set widget position, preview, and default agent.
        </p>
      </CardContent>
    </Card>
  );
}
