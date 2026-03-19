/**
 * Returns setup progress for Simple Mode home: business info, AI trained, widget ready.
 * Used to drive the primary CTA and setup progress section.
 */
import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const [
    { data: businessSettings },
    { data: agents },
    { data: knowledgeSources },
    { data: latestRun },
  ] = await Promise.all([
    supabase.from('business_settings').select('business_name, website_url, website_learned_at').eq('organization_id', orgId).single(),
    supabase.from('agents').select('id').eq('organization_id', orgId).limit(1),
    supabase.from('knowledge_sources').select('id').eq('organization_id', orgId).limit(1),
    supabase.from('website_auto_setup_runs').select('status').eq('organization_id', orgId).order('started_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const businessInfoDone = !!(businessSettings?.business_name?.trim());
  const aiTrainedDone =
    latestRun?.status === 'done' ||
    !!(businessSettings?.website_learned_at) ||
    (knowledgeSources && knowledgeSources.length > 0);
  const widgetReadyDone = !!(agents && agents.length > 0);

  return NextResponse.json({
    businessInfoDone,
    aiTrainedDone,
    widgetReadyDone,
    hasWebsiteUrl: !!(businessSettings?.website_url?.trim()),
  });
}
