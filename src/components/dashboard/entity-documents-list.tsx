'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Link } from '@/components/intl-link';
import { FileText } from 'lucide-react';
import { formatDate } from '@/lib/utils';

type Doc = { id: string; name: string; metadata: { generation_type?: string }; created_at: string };

type Props = {
  leadId?: string | null;
  quoteRequestId?: string | null;
};

export function EntityDocumentsList({ leadId, quoteRequestId }: Props) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leadId && !quoteRequestId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    let q = supabase
      .from('documents')
      .select('id, name, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    if (leadId) q = q.eq('lead_id', leadId);
    if (quoteRequestId) q = q.eq('quote_request_id', quoteRequestId);
    q.then(({ data }) => {
      setDocs((data ?? []) as Doc[]);
      setLoading(false);
    });
  }, [leadId, quoteRequestId]);

  if (loading) return <p className="text-xs text-muted-foreground">Loading documents…</p>;
  if (!docs.length) return null;

  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-xs font-medium text-muted-foreground mb-2">Documents</p>
      <ul className="space-y-1.5">
        {docs.map((doc) => (
          <li key={doc.id} className="flex items-center justify-between gap-2 text-sm">
            <Link
              href={`/dashboard/documents/${doc.id}`}
              className="flex items-center gap-2 text-primary hover:underline min-w-0"
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{doc.name}</span>
            </Link>
            <span className="text-xs text-muted-foreground shrink-0">
              {(doc.metadata?.generation_type ?? 'document').replace(/_/g, ' ')} · {formatDate(doc.created_at)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
