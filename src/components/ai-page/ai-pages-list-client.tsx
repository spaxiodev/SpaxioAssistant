'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Eye, EyeOff } from 'lucide-react';
type Props = {
  pageId: string;
  slug: string;
  isPublished: boolean;
  publicUrl: string;
};

export function AiPagesListClient({ pageId, slug, isPublished, publicUrl }: Props) {
  const [copied, setCopied] = useState(false);

  async function handlePublishToggle() {
    await fetch(`/api/dashboard/ai-pages/${pageId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_published: !isPublished }),
    });
    window.location.reload();
  }

  function handleCopyLink() {
    void navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Button variant="ghost" size="icon" onClick={handleCopyLink} title="Copy link">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="sm" onClick={handlePublishToggle}>
        {isPublished ? (
          <>
            <EyeOff className="mr-1 h-4 w-4" />
            Unpublish
          </>
        ) : (
          <>
            <Eye className="mr-1 h-4 w-4" />
            Publish
          </>
        )}
      </Button>
    </>
  );
}
