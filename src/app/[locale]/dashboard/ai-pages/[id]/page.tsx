import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPageById } from '@/lib/ai-pages/config-service';
import { getPublicAppUrl } from '@/lib/app-url';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { Link } from '@/components/intl-link';
import { AiPageForm } from '@/components/ai-page/ai-page-form';
import { AiPageInstallCard } from '@/components/ai-page/ai-page-install-card';
import { AiPageEditActions } from '@/components/ai-page/ai-page-edit-actions';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditAiPagePage({ params }: Props) {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const { id } = await params;
  const supabase = createAdminClient();
  const page = await getPageById(supabase, id, orgId);
  if (!page) notFound();

  const headersList = await headers();
  const baseUrl = getPublicAppUrl({ headers: headersList });

  const [{ data: agents }, { data: pricingProfiles }] = await Promise.all([
    supabase.from('agents').select('id, name').eq('organization_id', orgId).order('name'),
    supabase.from('quote_pricing_profiles').select('id, name').eq('organization_id', orgId).order('name'),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/dashboard/ai-pages" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to AI Pages
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Edit AI Page</h1>
          <p className="text-muted-foreground">
            {page.title} · /a/p/{page.id}
          </p>
        </div>
        <AiPageEditActions
          pageId={page.id}
          pageTitle={page.title}
          isPublished={!!page.is_published}
        />
      </div>
      <AiPageForm
        agents={agents ?? []}
        pricingProfiles={pricingProfiles ?? []}
        initial={{
          id: page.id,
          title: page.title,
          slug: page.slug,
          description: page.description,
          page_type: page.page_type,
          deployment_mode: page.deployment_mode,
          agent_id: page.agent_id,
          welcome_message: page.welcome_message,
          intro_copy: page.intro_copy,
          trust_copy: page.trust_copy,
          pricing_profile_id: page.pricing_profile_id ?? undefined,
        }}
      />
      <AiPageInstallCard
        pageId={page.id}
        baseUrl={baseUrl}
        isPublished={!!page.is_published}
      />
    </div>
  );
}
