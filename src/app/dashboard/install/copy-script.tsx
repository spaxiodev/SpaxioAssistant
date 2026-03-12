'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type CopyScriptProps = {
  text: string;
  copiedTitle?: string;
  copiedDescription?: string;
  copyCodeLabel?: string;
  copiedButtonLabel?: string;
};

export function CopyScript({
  text,
  copiedTitle = 'Copied',
  copiedDescription = 'Install code copied to clipboard.',
  copyCodeLabel = 'Copy code',
  copiedButtonLabel = 'Copied',
}: CopyScriptProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: copiedTitle, description: copiedDescription });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={copy}
      className="rounded-lg"
    >
      {copied ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          {copiedButtonLabel}
        </>
      ) : (
        <>
          <Copy className="mr-2 h-4 w-4" />
          {copyCodeLabel}
        </>
      )}
    </Button>
  );
}
