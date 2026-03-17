'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ViewModeClientGate } from '@/components/dashboard/view-mode-client-gate';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Trash2 } from 'lucide-react';

type MemoryRow = {
  id: string;
  memory_type: string;
  title: string | null;
  summary: string;
  structured_facts: Record<string, unknown>;
  confidence: number;
  created_at: string;
};

type Props = {
  subjectType: 'lead' | 'contact' | 'conversation';
  subjectId: string;
};

export function MemoryCard({ subjectType, subjectId }: Props) {
  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!subjectId) {
      setMemories([]);
      setLoading(false);
      return;
    }
    fetch(`/api/memories?subjectType=${encodeURIComponent(subjectType)}&subjectId=${encodeURIComponent(subjectId)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setMemories(Array.isArray(data) ? data : []))
      .catch(() => setMemories([]))
      .finally(() => setLoading(false));
  }, [subjectType, subjectId]);

  const archive = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/memories/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast({ title: 'Error', description: 'Failed to remove memory', variant: 'destructive' });
        return;
      }
      setMemories((prev) => prev.filter((m) => m.id !== id));
      toast({ title: 'Removed', description: 'Memory archived.' });
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (memories.length === 0) return null;

  return (
    <Card className="overflow-hidden border-primary/10">
      <CardHeader className="py-3">
        <span className="text-sm font-medium text-foreground">What we know so far</span>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <ViewModeClientGate
          simple={
            <ul className="space-y-2 text-sm text-muted-foreground">
              {memories.map((m) => (
                <li key={m.id}>{m.summary}</li>
              ))}
            </ul>
          }
          developer={
            <ul className="space-y-3">
              {memories.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-2 rounded border p-2 text-sm">
                  <div>
                    {m.title && <span className="font-medium">{m.title}</span>}
                    <p className="text-muted-foreground">{m.summary}</p>
                    <span className="text-xs text-muted-foreground">
                      {m.memory_type} · confidence {Math.round(m.confidence * 100)}%
                    </span>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => archive(m.id)}
                    disabled={deletingId === m.id}
                  >
                    {deletingId === m.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          }
        />
      </CardContent>
    </Card>
  );
}
