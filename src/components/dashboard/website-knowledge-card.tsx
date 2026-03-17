'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

type WebsiteKnowledgeCardProps = {
  websiteUrl?: string | null;
  learnedAt: string;
};

export function WebsiteKnowledgeCard({ websiteUrl, learnedAt }: WebsiteKnowledgeCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch('/api/settings/learn-website', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: 'Failed to delete',
          description: data?.error ?? 'Could not delete website knowledge',
          variant: 'destructive',
        });
        return;
      }
      toast({ title: 'Website knowledge deleted', description: 'The assistant will no longer use this content.' });
      router.refresh();
    } catch {
      toast({
        title: 'Error',
        description: 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  }

  const learnedDate = new Date(learnedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-muted-foreground" />
            Website knowledge
          </CardTitle>
          <CardDescription>
            Content learned from your website. {websiteUrl && (
              <>Source: <span className="truncate font-mono text-xs">{websiteUrl}</span></>
            )} Learned {learnedDate}.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Delete
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground">
          This content was extracted from your website and is used by the assistant to answer visitor questions. Deleting removes it from the assistant&apos;s context.
        </p>
      </CardContent>
    </Card>
  );
}
