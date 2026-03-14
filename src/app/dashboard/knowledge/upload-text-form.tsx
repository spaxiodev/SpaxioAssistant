'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';

type Source = { id: string; name: string };

export function UploadTextForm({ sources, onSuccess }: { sources: Source[]; onSuccess?: () => void }) {
  const router = useRouter();
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSuccess = () => {
    onSuccess?.();
    router.refresh();
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceId || !content.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/knowledge/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          title: title.trim() || undefined,
          content: content.trim(),
          embed: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Error', description: data.error ?? 'Failed to upload', variant: 'destructive' });
        return;
      }
      toast({
        title: 'Content uploaded',
        description: `${data.chunksCreated ?? 0} chunks, ${data.embeddingsCreated ?? 0} embedded.`,
      });
      setTitle('');
      setContent('');
      handleSuccess();
    } finally {
      setLoading(false);
    }
  }

  if (sources.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Create a source first, then you can upload text to it.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="upload-source">Source</Label>
        <select
          id="upload-source"
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="upload-title">Title (optional)</Label>
        <Input
          id="upload-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. FAQ section"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="upload-content">Content</Label>
        <Textarea
          id="upload-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste or type the text to add to the knowledge base…"
          rows={8}
          className="mt-1"
        />
      </div>
      <Button type="submit" disabled={loading || !content.trim()}>
        {loading ? 'Uploading…' : 'Upload & embed'}
      </Button>
    </form>
  );
}
