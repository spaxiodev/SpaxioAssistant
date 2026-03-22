import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { EmbeddedFormsListClient } from '../../../dashboard/embedded-forms/embedded-forms-list-client';

export default async function EmbeddedFormsPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const { data: forms } = await supabase
    .from('embedded_forms')
    .select('id, name, form_type, is_active, created_at, updated_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  // Fetch submission counts per form
  const formIds = (forms ?? []).map((f) => f.id);
  let counts: Record<string, number> = {};
  if (formIds.length > 0) {
    const { data: countRows } = await supabase
      .from('form_submissions')
      .select('form_id')
      .in('form_id', formIds);
    for (const row of countRows ?? []) {
      counts[row.form_id] = (counts[row.form_id] ?? 0) + 1;
    }
  }

  const formsWithCounts = (forms ?? []).map((f) => ({
    ...f,
    submission_count: counts[f.id] ?? 0,
  }));

  return <EmbeddedFormsListClient initialForms={formsWithCounts} />;
}
