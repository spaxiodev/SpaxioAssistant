'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

type Source = { id: string; name: string };

export function IngestUrlForm({ sources, onSuccess }: { sources: Source[]; onSuccess?: () => void }) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSuccess = () => {
    onSuccess?.();
    router.refresh();
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/knowledge/ingest-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          name: name.trim() || undefined,
          sourceId: sourceId || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Error', description: data.error ?? 'Failed to ingest URL', variant: 'destructive' });
        return;
      }
      toast({
        title: 'Page ingested',
        description: `${data.chunksCreated ?? 0} chunks, ${data.embeddingsCreated ?? 0} embedded.`,
      });
      setUrl('');
      setName('');
      handleSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="ingest-url">Page URL</Label>
        <Input
          id="ingest-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/page"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="ingest-name">Source name (optional, for new source)</Label>
        <Input
          id="ingest-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Homepage"
          className="mt-1"
        />
      </div>
      {sources.length > 0 && (
        <div>
          <Label htmlFor="ingest-source">Add to existing source (optional)</Label>
          <select
            id="ingest-source"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Create new source</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <Button type="submit" disabled={loading || !url.trim()}>
        {loading ? 'Ingesting…' : 'Import from URL'}
      </Button>
    </form>
  );
}
