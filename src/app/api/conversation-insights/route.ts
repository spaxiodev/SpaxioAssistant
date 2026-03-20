/**
 * GET  /api/conversation-insights – Return stored insights for the org.
 * POST /api/conversation-insights – Trigger analysis (rate-limited; pro+ only).
 *
 * Conversation insights are learning signals derived from real conversations.
 * They surface: frequent questions, pricing confusion, service patterns, and gaps.
 * They are NEVER auto-applied — always presented for business review.
 */
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { requireOrg } from '@/lib/api-org-auth';
import { canUseConversationLearning } from '@/lib/entitlements';
import { analyzeConversationsForOrg, persistConversationInsights } from '@/lib/conversation-learning/analyze-conversations';

export async function GET() {
  try {
    const auth = await requireOrg();
    if (!auth.ok) return auth.response;
    const { organizationId, supabase, adminAllowed } = auth;

    // Load recent insights from DB (last 60 days)
    const since = new Date();
    since.setDate(since.getDate() - 60);

    const { data: insights, error } = await supabase
      .from('conversation_insights')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('period_start', since.toISOString().slice(0, 10))
      .order('occurrence_count', { ascending: false })
      .limit(20);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const enabled = await canUseConversationLearning(supabase, organizationId, adminAllowed);

    return NextResponse.json({
      insights: insights ?? [],
      enabled,
      message: !enabled
        ? 'Upgrade to Pro to unlock conversation learning insights.'
        : undefined,
    });
  } catch (err) {
    return handleApiError(err, 'conversation-insights');
  }
}

export async function POST() {
  try {
    const auth = await requireOrg();
    if (!auth.ok) return auth.response;
    const { organizationId, supabase, adminAllowed } = auth;

    const enabled = await canUseConversationLearning(supabase, organizationId, adminAllowed);
    if (!enabled) {
      return NextResponse.json(
        { error: 'Conversation learning requires Pro plan or above.', upgrade_required: true },
        { status: 403 }
      );
    }

    // Rate limit: check if analysis was run in the last 6 hours
    const sixHoursAgo = new Date();
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);

    const { data: recent } = await supabase
      .from('conversation_insights')
      .select('id')
      .eq('organization_id', organizationId)
      .gte('updated_at', sixHoursAgo.toISOString())
      .limit(1);

    if (recent && recent.length > 0) {
      return NextResponse.json({
        message: 'Analysis was recently run. Check back in a few hours for updated insights.',
        rate_limited: true,
      });
    }

    // Run analysis
    const result = await analyzeConversationsForOrg(supabase, organizationId);

    if (result.conversations_analyzed === 0) {
      return NextResponse.json({
        message: 'Not enough conversation data yet. Once your assistant has more conversations, insights will appear here.',
        insights: [],
      });
    }

    // Persist insights
    await persistConversationInsights(supabase, organizationId, result);

    return NextResponse.json({
      insights: result.insights,
      conversations_analyzed: result.conversations_analyzed,
      period_start: result.period_start,
      period_end: result.period_end,
    });
  } catch (err) {
    return handleApiError(err, 'conversation-insights');
  }
}
