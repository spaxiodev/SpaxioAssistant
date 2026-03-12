import { createAdminClient } from '@/lib/supabase/admin';

export async function ensureUserOrganization(
  userId: string,
  fullName?: string,
  businessName?: string | null,
  industry?: string | null,
) {
  const supabase = createAdminClient();

  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (member) {
    return member.organization_id;
  }

  const orgName = fullName || businessName || 'My Organization';
  const baseSlug = orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'org';
  const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: orgName, slug })
    .select('id')
    .single();

  if (orgError || !org) {
    return null;
  }

  const { error: memberError } = await supabase.from('organization_members').insert({
    organization_id: org.id,
    user_id: userId,
    role: 'owner',
  });

  if (memberError) {
    return null;
  }

  const { error: businessSettingsError } = await supabase.from('business_settings').insert({
    organization_id: org.id,
    business_name: businessName ?? null,
    industry: industry ?? null,
  });

  if (businessSettingsError) {
    return null;
  }

  const { error: widgetError } = await supabase
    .from('widgets')
    .insert({ organization_id: org.id, name: 'Chat' });

  if (widgetError) {
    return null;
  }

  const { error: subscriptionError } = await supabase.from('subscriptions').insert({
    organization_id: org.id,
    status: 'trialing',
    trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (subscriptionError) {
    return null;
  }

  return org.id;
}
