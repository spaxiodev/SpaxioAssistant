import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import { Link } from '@/components/intl-link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

type Props = { params: Promise<{ id: string }> };

export default async function DocumentDetailPage({ params }: Props) {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const { id } = await params;
  const supabase = createAdminClient();
  const { data: doc, error } = await supabase
    .from('documents')
    .select('id, name, content, metadata, lead_id, quote_request_id, conversation_id, created_at, updated_at')
    .eq('id', id)
    .eq('organization_id', orgId)
    .maybeSingle();

  if (error || !doc) notFound();

  const metadata = (doc.metadata as { generation_type?: string; source_type?: string }) ?? {};
  const generationType = metadata.generation_type ?? 'document';

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/documents" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Documents
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{doc.name}</h1>
        <p className="text-muted-foreground">
          {generationType.replace(/_/g, ' ')} · {formatDate(doc.created_at)}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Links</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm">
          {doc.lead_id && (
            <Link href={`/dashboard/leads`} className="text-primary underline">
              View lead
            </Link>
          )}
          {doc.quote_request_id && (
            <Link href={`/dashboard/quote-requests`} className="text-primary underline">
              View quote request
            </Link>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
            {doc.content || '—'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
