import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTranslations } from 'next-intl/server';
import { BookOpen } from 'lucide-react';
import { AddSourceForm } from '@/app/dashboard/knowledge/add-source-form';
import { IngestUrlForm } from '@/app/dashboard/knowledge/ingest-url-form';
import { UploadTextForm } from '@/app/dashboard/knowledge/upload-text-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ViewModeClientGate } from '@/components/dashboard/view-mode-client-gate';
import { SimpleKnowledgeContent } from '@/components/dashboard/simple-knowledge-content';

export default async function KnowledgePage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const { data: sources } = await supabase
    .from('knowledge_sources')
    .select('id, name, source_type, last_synced_at, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  const sourceList = (sources ?? []).map((s) => ({ id: s.id, name: s.name }));
  const hasSources = (sources?.length ?? 0) > 0;

  const developerContent = (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('knowledge')}</h1>
        <p className="text-muted-foreground">{t('knowledgeDescription')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('knowledge')}</CardTitle>
          <CardDescription>
            Add knowledge sources and content. Agents with search_knowledge_base enabled can use this for answers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(sources?.length ?? 0) === 0 ? (
            <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 p-8 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No knowledge sources yet.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create a source below, then add content via URL or paste.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {sources?.map((src) => (
                <li key={src.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium">{src.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {src.source_type} · Last synced:{' '}
                      {src.last_synced_at ? new Date(src.last_synced_at).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <Tabs defaultValue="source" className="w-full">
            <TabsList>
              <TabsTrigger value="source">New source</TabsTrigger>
              <TabsTrigger value="url">Import from URL</TabsTrigger>
              <TabsTrigger value="upload">Upload text</TabsTrigger>
            </TabsList>
            <TabsContent value="source" className="pt-4">
              <AddSourceForm />
            </TabsContent>
            <TabsContent value="url" className="pt-4">
              <IngestUrlForm sources={sourceList} />
            </TabsContent>
            <TabsContent value="upload" className="pt-4">
              <UploadTextForm sources={sourceList} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <ViewModeClientGate
      simple={
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Content</h1>
            <p className="text-muted-foreground">
              Add your materials and let Spaxio organize them into courses and lessons for you.
            </p>
          </div>
          <SimpleKnowledgeContent hasSources={hasSources} />
          {developerContent}
        </div>
      }
      developer={developerContent}
    />
  );
}
