import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { getOrganizationAccessSnapshot, canCreateResourceFromSnapshot } from '@/lib/billing/access';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTranslations } from 'next-intl/server';
import { BookOpen } from 'lucide-react';
import { AddSourceForm } from '@/app/dashboard/knowledge/add-source-form';
import { IngestUrlForm } from '@/app/dashboard/knowledge/ingest-url-form';
import { UploadTextForm } from '@/app/dashboard/knowledge/upload-text-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ViewModeClientGate } from '@/components/dashboard/view-mode-client-gate';
import { SimpleKnowledgeContent } from '@/components/dashboard/simple-knowledge-content';
import { WebsiteKnowledgeCard } from '@/components/dashboard/website-knowledge-card';
import { UsageLimitBanner } from '@/components/dashboard/usage-limit-banner';

export default async function KnowledgePage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');
  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const snapshot = await getOrganizationAccessSnapshot(supabase, orgId, adminAllowed);
  const knowledgeCreateStatus = canCreateResourceFromSnapshot(snapshot, 'knowledge_sources');
  const canAddSource = knowledgeCreateStatus === 'allowed' || knowledgeCreateStatus === 'warning';

  const [
    { data: sources },
    { data: businessSettings },
  ] = await Promise.all([
    supabase
      .from('knowledge_sources')
      .select('id, name, source_type, last_synced_at, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false }),
    supabase
      .from('business_settings')
      .select('website_url, website_learned_at')
      .eq('organization_id', orgId)
      .single(),
  ]);

  const sourceList = (sources ?? []).map((s) => ({ id: s.id, name: s.name }));
  const hasSources = (sources?.length ?? 0) > 0;
  const hasWebsiteKnowledge = !!(businessSettings?.website_learned_at as string | null);

  const developerContent = (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('knowledge')}</h1>
        <p className="text-muted-foreground">{t('knowledgeDescription')}</p>
      </div>

      {hasWebsiteKnowledge && (
        <WebsiteKnowledgeCard
          websiteUrl={businessSettings?.website_url as string | null}
          learnedAt={businessSettings?.website_learned_at as string}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('knowledge')}</CardTitle>
          <CardDescription>
            Add website URLs and files so your assistant can answer using your real content.
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

          {(knowledgeCreateStatus === 'limit_reached' || knowledgeCreateStatus === 'requires_upgrade') && (
            <UsageLimitBanner
              resourceLabel="knowledge sources"
              used={snapshot.richUsage.knowledge_sources_count}
              limit={snapshot.richUsage.knowledge_sources_limit}
              status={knowledgeCreateStatus}
            />
          )}

          {canAddSource && (
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
          )}
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
              Add your website pages and files so the assistant can answer accurately.
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
