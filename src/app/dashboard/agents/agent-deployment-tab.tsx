'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Link } from '@/components/intl-link';
import { Copy } from 'lucide-react';
import { AiPageEditActions } from '@/components/ai-page/ai-page-edit-actions';

type AiPage = { id: string; slug: string; title: string; is_published: boolean | null; is_enabled?: boolean | null };

export function AgentDeploymentTab({
  agentId,
  agentName: _agentName,
  widgetEnabled,
  widgetId,
  aiPages = [],
  locale = 'en',
}: {
  agentId: string;
  agentName: string;
  widgetEnabled: boolean;
  widgetId?: string | null;
  aiPages?: AiPage[];
  locale?: string;
}) {
  const router = useRouter();
  const [scriptTag, setScriptTag] = useState<string>('');
  const { toast } = useToast();
  const t = useTranslations('dashboard');

  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const script = widgetId
      ? `<script src="${origin}/widget.js" data-widget-id="${widgetId}"></script>`
      : `<script src="${origin}/widget.js" data-agent-id="${agentId}"></script>`;
    setScriptTag(script);
  }, [agentId, widgetId]);

  function copyToClipboard(text: string, label: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied to clipboard.` });
  }

  const hasWidget = !!widgetId || widgetEnabled;
  const hasFullPage = aiPages.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deployment</CardTitle>
        <CardDescription>Website widget, embed, and deployment options.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Widget install code */}
        {hasWidget && (
          <div>
            <h4 className="mb-2 text-sm font-medium">Widget embed</h4>
            <p className="mb-2 text-xs text-muted-foreground">
              {widgetId
                ? 'Add this script to your site. This embed is for this agent only.'
                : 'Add this script to your site. It uses your agent ID so the widget loads this agent (no widget ID needed).'}
            </p>
            <pre className="rounded-md border border-border bg-muted/50 p-3 text-xs font-mono break-all">
              {scriptTag || 'Loading…'}
            </pre>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => copyToClipboard(scriptTag, 'Embed code')} disabled={!scriptTag}>
              <Copy className="mr-2 h-4 w-4" />
              Copy embed code
            </Button>
          </div>
        )}

        {/* Full page install code */}
        {hasFullPage && (
          <div className="space-y-4 border-t border-border pt-6">
            <h4 className="text-sm font-medium">Full page link &amp; embed</h4>
            <p className="text-xs text-muted-foreground">
              Shareable link or embed for each AI page linked to this agent.
            </p>
            {aiPages.map((page) => {
              const origin = typeof window !== 'undefined' ? window.location.origin : '';
              const hostedUrl = `${origin}/${locale}/a/p/${page.id}`;
              const embedUrl = `${origin}/${locale}/a/p/${page.id}?embed=1`;
              const embedCode = `<iframe src="${embedUrl}" title="Assistant" width="100%" height="600" frameborder="0" allow="clipboard-write"></iframe>`;
              return (
                <div key={page.id} className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{page.title}</p>
                      {!page.is_published && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                          {t('installFullPageDraftNote')}
                        </span>
                      )}
                    </div>
                    <AiPageEditActions
                      pageId={page.id}
                      pageTitle={page.title}
                      isPublished={!!page.is_published}
                      isEnabled={page.is_enabled !== false}
                      showPause
                      onDeleteSuccess={() => router.refresh()}
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Shareable link</p>
                    <pre className="overflow-x-auto rounded-md bg-muted/50 p-2 text-xs break-all">{hostedUrl}</pre>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => copyToClipboard(hostedUrl, 'Link')}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy link
                    </Button>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Embed code (paste into your site)</p>
                    <pre className="overflow-x-auto rounded-md bg-muted/50 p-2 text-xs">
                      <code>{embedCode}</code>
                    </pre>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => copyToClipboard(embedCode, 'Embed code')}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy embed code
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!hasWidget && !hasFullPage && (
          <p className="text-sm text-muted-foreground">
            No widget is linked to this agent yet. Go to Install &amp; Deployments to assign widgets and copy embed codes.
          </p>
        )}

        <p className="text-sm text-muted-foreground">
          <Link href="/dashboard/install" className="text-primary underline underline-offset-2">
            Go to Install &amp; Deployments
          </Link>
          {' '}to see all agents&apos; embed codes, set widget position, and preview.
        </p>
      </CardContent>
    </Card>
  );
}
