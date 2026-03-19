'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CopyScript } from '@/app/dashboard/install/copy-script';
import { Copy, ExternalLink, Code, LayoutGrid, MessageCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Props = {
  /** Page ID for unique URLs (/a/p/[id]). Use this for shareable links and embeds. */
  pageId: string;
  baseUrl: string;
  isPublished: boolean;
  copyCodeLabel?: string;
  copiedTitle?: string;
};

export function AiPageInstallCard({
  pageId,
  baseUrl,
  isPublished,
  copyCodeLabel = 'Copy code',
  copiedTitle = 'Copied',
}: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const locale = 'en';
  const hostedUrl = `${baseUrl}/${locale}/a/p/${pageId}`;
  const embedUrl = `${baseUrl}/${locale}/a/p/${pageId}?embed=1`;
  const embedCode = `<iframe src="${embedUrl}" title="Assistant" width="100%" height="600" frameborder="0" allow="clipboard-write"></iframe>`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Install & embed</CardTitle>
        <CardDescription>
          Use the hosted link or embed the full-page assistant on your website. Only published pages can be embedded.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Explain difference */}
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="font-medium mb-2">Ways to use your assistant:</p>
          <ul className="space-y-1.5 text-muted-foreground">
            <li className="flex items-start gap-2">
              <MessageCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span><strong className="text-foreground">Widget</strong> — Chat bubble on your site (set up in Install).</span>
            </li>
            <li className="flex items-start gap-2">
              <ExternalLink className="h-4 w-4 shrink-0 mt-0.5" />
              <span><strong className="text-foreground">Full-page hosted</strong> — Link to this page on Spaxio.</span>
            </li>
            <li className="flex items-start gap-2">
              <LayoutGrid className="h-4 w-4 shrink-0 mt-0.5" />
              <span><strong className="text-foreground">Embedded full-page</strong> — Same experience inside an iframe on your site.</span>
            </li>
          </ul>
        </div>

        {/* Hosted link */}
        <div>
          <p className="text-sm font-medium mb-1">Hosted page link</p>
          <pre className="overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs break-all">
            {hostedUrl}
          </pre>
          <CopyScript
            text={hostedUrl}
            copyCodeLabel={copyCodeLabel}
            copiedTitle={copiedTitle}
            copiedDescription="Hosted page link copied."
          />
        </div>

        {/* Embed code */}
        <div>
          <p className="text-sm font-medium mb-1">Embed code (for your website)</p>
          <pre className="overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs">
            <code>{embedCode}</code>
          </pre>
          <CopyScript
            text={embedCode}
            copyCodeLabel={copyCodeLabel}
            copiedTitle={copiedTitle}
            copiedDescription="Embed code copied. Paste into your site HTML."
          />
        </div>

        {/* Preview embedded */}
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewOpen(true)}
            disabled={!isPublished}
          >
            <Code className="mr-2 h-4 w-4" />
            Preview embedded page
          </Button>
          {!isPublished && (
            <p className="mt-1 text-xs text-muted-foreground">Publish this page to enable embedding and preview.</p>
          )}
        </div>
      </CardContent>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Embedded preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 px-6 pb-6">
            <iframe
              src={embedUrl}
              title="Assistant preview"
              className="w-full h-full rounded-lg border bg-muted/20"
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
