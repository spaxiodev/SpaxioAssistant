'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { FileText, Loader2 } from 'lucide-react';
import { Link } from '@/components/intl-link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type GenerationType = 'quote_draft' | 'proposal_draft' | 'lead_summary' | 'conversation_summary' | 'follow_up_summary';
type SourceType = 'lead' | 'quote_request' | 'deal' | 'none';

type Props = {
  sourceType: SourceType;
  sourceId: string | null;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Primary CTA label when single action (e.g. "Make a quote draft") */
  primaryLabel?: string;
  /** Primary generation type when single action */
  primaryType?: GenerationType;
  /** Show as dropdown with multiple options; if false, single button with primaryType */
  asDropdown?: boolean;
};

const LABELS: Record<GenerationType, string> = {
  quote_draft: 'Generate quote draft',
  proposal_draft: 'Generate proposal',
  lead_summary: 'Summarize this lead',
  conversation_summary: 'Conversation summary',
  follow_up_summary: 'Follow-up summary',
};

export function GenerateDocumentActions({
  sourceType,
  sourceId,
  variant = 'outline',
  size = 'sm',
  primaryLabel,
  primaryType = 'quote_draft',
  asDropdown = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const run = async (generationType: GenerationType) => {
    if (sourceType !== 'none' && !sourceId) {
      toast({ title: 'Error', description: 'Missing source', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationType,
          sourceType: sourceType === 'none' ? 'none' : sourceType,
          sourceId: sourceType === 'none' ? undefined : sourceId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Error', description: data.error || 'Generation failed', variant: 'destructive' });
        return;
      }
      const docId = data.documentId as string | undefined;
      const name = data.name as string | undefined;
      if (generationType === 'quote_draft' && docId) {
        toast({
          title: 'Quote draft created',
          description: (
            <span className="flex flex-wrap gap-2 mt-1">
              <Link href={`/dashboard/documents/${docId}`} className="text-sm font-medium underline">
                Open draft
              </Link>
              <Link href="/dashboard/documents" className="text-sm font-medium underline">
                View in Documents
              </Link>
            </span>
          ),
        });
      } else {
        toast({
          title: 'Document created',
          description: docId ? (
            <span className="flex flex-wrap gap-2 mt-1">
              <Link href={`/dashboard/documents/${docId}`} className="text-sm font-medium underline">
                Open
              </Link>
              <Link href="/dashboard/documents" className="text-sm font-medium underline">
                Documents
              </Link>
            </span>
          ) : (data.name as string),
        });
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  if (asDropdown) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            <span className="ml-1">Generate document</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => run('quote_draft')} disabled={loading}>
            {LABELS.quote_draft}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => run('proposal_draft')} disabled={loading}>
            {LABELS.proposal_draft}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => run('lead_summary')} disabled={loading}>
            {LABELS.lead_summary}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => run('follow_up_summary')} disabled={loading}>
            {LABELS.follow_up_summary}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => run(primaryType)}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      <span className="ml-1">{primaryLabel ?? LABELS[primaryType]}</span>
    </Button>
  );
}
