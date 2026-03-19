/**
 * GET /api/simple/next-action
 * Returns the recommended next action for Simple Mode based on setup state, leads, conversations.
 * Used by useNextBestAction hook and dashboard.
 */
import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';

export type NextActionId =
  | 'setup_assistant'
  | 'add_website_info'
  | 'install_on_website'
  | 'test_assistant'
  | 'view_conversations'
  | 'view_leads';

export type NextAction = {
  id: NextActionId;
  label: string;
  description: string;
  href: string;
};

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
    { data: widgets },
    { count: leadsCount },
    { count: quoteRequestsCount },
  ] = await Promise.all([
    supabase.from('business_settings').select('business_name, website_url, website_learned_at').eq('organization_id', orgId).single(),
    supabase.from('agents').select('id').eq('organization_id', orgId).limit(1),
    supabase.from('knowledge_sources').select('id').eq('organization_id', orgId).limit(1),
    supabase.from('website_auto_setup_runs').select('status').eq('organization_id', orgId).order('started_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('widgets').select('id').eq('organization_id', orgId),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('quote_requests').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
  ]);

  let conversationsCount = 0;
  const widgetIds = (widgets ?? []).map((w) => w.id);
  if (widgetIds.length > 0) {
    const { count } = await supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .in('widget_id', widgetIds);
    conversationsCount = typeof count === 'number' ? count : 0;
  }

  const businessInfoDone = !!(businessSettings?.business_name?.trim());
  const hasWebsiteUrl = !!(businessSettings?.website_url?.trim());
  const aiTrainedDone =
    latestRun?.status === 'done' ||
    !!(businessSettings?.website_learned_at) ||
    (knowledgeSources && knowledgeSources.length > 0);
  const widgetReadyDone = !!(agents && agents.length > 0);
  const convCount = conversationsCount;
  const leadCount = typeof leadsCount === 'number' ? leadsCount : 0;
  const quoteCount = typeof quoteRequestsCount === 'number' ? quoteRequestsCount : 0;
  const hasLeadsOrQuotes = leadCount > 0 || quoteCount > 0;
  const hasConversations = convCount > 0;

  // Determine single primary next action (priority order)
  let action: NextAction;
  if (!businessInfoDone || !aiTrainedDone) {
    action = {
      id: 'setup_assistant',
      label: 'Set up your assistant',
      description: 'Add your website URL and we\'ll configure your assistant.',
      href: '/dashboard/ai-setup',
    };
  } else if (!hasWebsiteUrl && !(knowledgeSources && knowledgeSources.length > 0)) {
    action = {
      id: 'add_website_info',
      label: 'Add your website info',
      description: 'Connect your website so the assistant learns your business.',
      href: '/dashboard/ai-setup',
    };
  } else if (!widgetReadyDone) {
    action = {
      id: 'setup_assistant',
      label: 'Finish setup',
      description: 'Review and publish your assistant settings.',
      href: '/dashboard/ai-setup',
    };
  } else {
    // Widget ready
    action = {
      id: 'install_on_website',
      label: 'Install on your website',
      description: 'Copy the code and add the chat widget to your site.',
      href: '/dashboard/install',
    };
  }

  // Override: if install is done (we can't verify), prioritize engagement
  if (widgetReadyDone && hasLeadsOrQuotes) {
    action = {
      id: 'view_leads',
      label: 'View leads',
      description: `You have ${leadCount + quoteCount} lead(s). Follow up from the Leads page.`,
      href: '/dashboard/leads',
    };
  }
  if (widgetReadyDone && hasConversations && !hasLeadsOrQuotes) {
    action = {
      id: 'view_conversations',
      label: 'View conversations',
      description: `You have ${convCount} conversation(s). Check your inbox.`,
      href: '/dashboard/conversations',
    };
  }
  if (widgetReadyDone && !hasConversations && !hasLeadsOrQuotes) {
    action = {
      id: 'test_assistant',
      label: 'Test your assistant',
      description: 'Preview the widget and try a test conversation.',
      href: '/dashboard/install',
    };
  }

  return NextResponse.json({
    action,
    progress: {
      businessInfoDone,
      aiTrainedDone,
      widgetReadyDone,
      hasWebsiteUrl,
    },
    counts: {
      leads: leadCount,
      conversations: convCount,
      quoteRequests: quoteCount,
    },
  });
}
