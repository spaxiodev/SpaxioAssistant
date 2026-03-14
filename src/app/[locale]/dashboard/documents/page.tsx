import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTranslations } from 'next-intl/server';
import { FileText } from 'lucide-react';

export default async function DocumentsPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const [
    { data: templates },
    { data: documents },
  ] = await Promise.all([
    supabase
      .from('document_templates')
      .select('id, name, template_type, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('documents')
      .select('id, name, template_id, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('documents')}</h1>
        <p className="text-muted-foreground">{t('documentsDescription')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>Create and edit document templates for quotes, proposals, and reports.</CardDescription>
        </CardHeader>
        <CardContent>
          {!templates?.length ? (
            <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 p-8 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No templates yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {templates.map((tm) => (
                <li key={tm.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <p className="font-medium">{tm.name}</p>
                  <span className="text-xs text-muted-foreground">{tm.template_type}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent documents</CardTitle>
          <CardDescription>Generated documents from automations and agents.</CardDescription>
        </CardHeader>
        <CardContent>
          {!documents?.length ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t('noDocuments')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <p className="font-medium">{doc.name}</p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
