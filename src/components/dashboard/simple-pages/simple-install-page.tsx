'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Globe } from 'lucide-react';
import { useViewMode } from '@/contexts/view-mode-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  SimplePageHeader,
  SimpleDeveloperModeLink,
  BlockingGuidancePanel,
  PreviewAssistantButton,
  SimpleSetupSkeleton,
} from '@/components/dashboard/simple';
import { CopyScript } from '@/app/dashboard/install/copy-script';
import { WidgetPreviewWithPreset } from '@/app/dashboard/install/widget-preview-with-preset';

type InstallData = {
  scriptTag: string;
  baseUrl: string;
  widgetId: string | null;
  assistantName: string | null;
  hasAgent: boolean;
  widgetLocale: string;
  widgetPositionPreset: string;
};

export function SimpleInstallPage() {
  const router = useRouter();
  const { setMode } = useViewMode();
  const [data, setData] = useState<InstallData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/install/simple-data')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openInDeveloperMode = (path: string) => {
    setMode('developer');
    router.push(path);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <SimplePageHeader
          title="Install your assistant"
          description="Add the chat widget to your website in a few steps."
        />
        <Card>
          <CardContent className="py-8">
            <SimpleSetupSkeleton lines={5} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasAgent = data?.hasAgent ?? false;
  const scriptTag = data?.scriptTag ?? '';
  const baseUrl = data?.baseUrl ?? '';
  const widgetId = data?.widgetId ?? '';
  const widgetLocale = (data?.widgetLocale as 'en' | 'fr-CA') ?? 'en';
  const widgetPositionPreset = data?.widgetPositionPreset ?? 'bottom-right';

  return (
    <div className="space-y-8">
      <SimplePageHeader
        title="Install your assistant"
        description="Copy the code below and add it to your website. Your chat will appear for visitors."
      />

      {!hasAgent && (
        <BlockingGuidancePanel
          title="Set up your assistant first"
          description="Add your website URL in AI Setup so we can create your assistant. Once it's ready, you'll return here to copy the install code."
          primaryAction={{ label: 'Go to AI Setup', href: '/dashboard/ai-setup' }}
          secondaryAction={{ label: 'Back to overview', href: '/dashboard' }}
          icon={Globe}
        />
      )}

      {hasAgent && (
        <>
          {/* Step-by-step */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Step 1: Copy the code</CardTitle>
              <CardDescription>
                Copy this snippet. You&apos;ll paste it into your website in the next step.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <pre className="overflow-x-auto rounded-xl bg-muted/50 p-4 text-sm shadow-[inset_0_1px_2px_hsl(var(--foreground)/0.04)]">
                <code>{scriptTag}</code>
              </pre>
              <CopyScript
                text={scriptTag}
                copiedTitle="Copied"
                copiedDescription="Install code copied to clipboard."
                copyCodeLabel="Copy code"
                copiedButtonLabel="Copied"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                  2
                </span>
                Step 2: Paste before {'</body>'}
              </CardTitle>
              <CardDescription>
                Open your website&apos;s HTML. Find the closing {'</body>'} tag and paste the code just before it. Save and publish.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Example:</p>
                <pre className="overflow-x-auto text-xs text-muted-foreground">
{`  ...your page content...
  <script src="${baseUrl}/widget.js" data-widget-id="..."></script>
</body>
</html>`}
                </pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
                  3
                </span>
                Step 3: Test your widget
              </CardTitle>
              <CardDescription>
                After publishing, visit your website. You should see a chat bubble. Click it to test.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => openInDeveloperMode('/dashboard/install')}>
                <ChevronRight className="h-4 w-4" />
                Open full install page for more options
              </Button>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Preview</CardTitle>
                <CardDescription>
                  See how your chat will look on desktop and mobile.
                </CardDescription>
              </div>
              <PreviewAssistantButton variant="outline" size="sm" />
            </CardHeader>
            <CardContent>
              <WidgetPreviewWithPreset
                widgetId={widgetId}
                baseUrl={baseUrl}
                locale={widgetLocale}
                initialPreset={widgetPositionPreset}
              />
            </CardContent>
          </Card>
        </>
      )}

      <SimpleDeveloperModeLink
        title="Advanced install options"
        description="Full-page embed, custom URLs, and more are available in Developer Mode."
        developerPath="/dashboard/install"
        linkLabel="Open Install in Developer Mode"
      />
    </div>
  );
}
