import { createAdminClient } from '@/lib/supabase/admin';

/** Get or create the default organization (used when auth is disabled). */
export async function getDefaultOrganizationId(): Promise<string | null> {
  const supabase = createAdminClient();

  const { data: orgs } = await supabase
    .from('organizations')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1);

  if (orgs && orgs.length > 0) {
    return orgs[0].id;
  }

  const slug = `default-${crypto.randomUUID().slice(0, 8)}`;
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: 'Default Organization', slug })
    .select('id')
    .single();

  if (orgError || !org) {
    return null;
  }

  await supabase.from('business_settings').insert({ organization_id: org.id });
  await supabase.from('widgets').insert({ organization_id: org.id, name: 'Chat' });
  await supabase.from('subscriptions').insert({
    organization_id: org.id,
    status: 'trialing',
    trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  });

  return org.id;
}
