import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getPublicAppUrl } from '@/lib/app-url';
import { Link } from '@/components/intl-link';
import { EmbeddedFormDetailClient } from '../../../../dashboard/embedded-forms/embedded-form-detail-client';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EmbeddedFormDetailPage({ params }: Props) {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const { id } = await params;
  const supabase = createAdminClient();

  const [
    { data: form },
    { data: pricingProfiles },
  ] = await Promise.all([
    supabase
      .from('embedded_forms')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single(),
    supabase
      .from('quote_pricing_profiles')
      .select('id, name')
      .eq('organization_id', orgId)
      .order('name'),
  ]);

  if (!form) notFound();

  const { data: fields } = await supabase
    .from('form_fields')
    .select('*')
    .eq('form_id', id)
    .order('sort_order');

  const { data: submissions } = await supabase
    .from('form_submissions')
    .select('*')
    .eq('form_id', id)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(200);

  const headersList = await headers();
  const baseUrl = getPublicAppUrl({ headers: headersList });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/dashboard/embedded-forms" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Embedded Forms
        </Link>
      </div>
      <EmbeddedFormDetailClient
        form={{ ...form, fields: fields ?? [] }}
        pricingProfiles={pricingProfiles ?? []}
        initialSubmissions={submissions ?? []}
        baseUrl={baseUrl}
      />
    </div>
  );
}
