'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

type SourceType = 'website_crawl' | 'manual_text' | 'pasted_content' | 'pdf_upload' | 'docx_upload';

export function AddSourceForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('manual_text');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSuccess = () => {
    onSuccess?.();
    router.refresh();
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/knowledge/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), source_type: sourceType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Error', description: data.error ?? 'Failed to create source', variant: 'destructive' });
        return;
      }
      toast({ title: 'Source created', description: data.name ?? name });
      setName('');
      handleSuccess();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="source-name">Name</Label>
        <Input
          id="source-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Product docs"
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="source-type">Type</Label>
        <select
          id="source-type"
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value as SourceType)}
          className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="manual_text">Manual text</option>
          <option value="pasted_content">Pasted content</option>
          <option value="website_crawl">Website crawl</option>
          <option value="pdf_upload">PDF upload</option>
          <option value="docx_upload">DOCX upload</option>
        </select>
      </div>
      <Button type="submit" disabled={loading || !name.trim()}>
        {loading ? 'Creating…' : 'Create source'}
      </Button>
    </form>
  );
}
