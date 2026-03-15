import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { conversationBelongsToOrg, getOrganizationIdForConversation } from '@/lib/conversation-org';
import { canUseInbox } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { InboxDetailClient } from '@/app/dashboard/inbox/inbox-detail-client';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function InboxConversationPage({ params }: Props) {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const { id: conversationId } = await params;

  const supabase = createAdminClient();
  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  if (!(await canUseInbox(supabase, orgId, adminAllowed))) return null;
  if (!(await conversationBelongsToOrg(supabase, conversationId, orgId))) notFound();

  const [
    convRes,
    messagesRes,
    notesRes,
    tagsRes,
    assignmentsRes,
    eventsRes,
    membersRes,
  ] = await Promise.all([
    supabase.from('conversations').select('*').eq('id', conversationId).single(),
    supabase.from('messages').select('id, role, content, created_at').eq('conversation_id', conversationId).order('created_at', { ascending: true }),
    supabase.from('conversation_notes').select('id, author_id, content, created_at').eq('conversation_id', conversationId).order('created_at', { ascending: false }),
    supabase.from('conversation_tags').select('id, tag, created_at').eq('conversation_id', conversationId),
    supabase.from('conversation_assignments').select('id, assignee_id, assigned_by_id, assigned_at').eq('conversation_id', conversationId).order('assigned_at', { ascending: false }),
    supabase.from('conversation_events').select('id, event_type, metadata, actor_id, created_at').eq('conversation_id', conversationId).order('created_at', { ascending: false }),
    supabase.from('organization_members').select('user_id').eq('organization_id', orgId),
  ]);

  if (convRes.error || !convRes.data) notFound();

  const widgetId = (convRes.data as { widget_id: string }).widget_id;
  const { data: widget } = await supabase.from('widgets').select('agent_id').eq('id', widgetId).single();
  const conversation = { ...convRes.data, agent_id: (widget as { agent_id?: string } | null)?.agent_id ?? null };

  let lead = null;
  let contact = null;
  const leadId = (conversation as { lead_id?: string | null }).lead_id;
  const contactId = (conversation as { contact_id?: string | null }).contact_id;
  if (leadId) {
    const { data: l } = await supabase.from('leads').select('*').eq('id', leadId).single();
    lead = l;
  }
  if (contactId) {
    const { data: c } = await supabase.from('contacts').select('*').eq('id', contactId).single();
    contact = c;
  }

  let voiceSession: { id: string; started_at: string; ended_at: string | null; duration_seconds: number | null; transcript_summary: string | null } | null = null;
  let voiceTranscripts: { speaker_type: string; text: string; timestamp: string }[] = [];
  const channelType = (conversation as { channel_type?: string }).channel_type;
  if (channelType === 'voice_browser' || channelType === 'voice_phone') {
    const { data: vs } = await supabase
      .from('voice_sessions')
      .select('id, started_at, ended_at, duration_seconds, transcript_summary')
      .eq('conversation_id', conversationId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (vs) {
      voiceSession = vs as { id: string; started_at: string; ended_at: string | null; duration_seconds: number | null; transcript_summary: string | null };
      const { data: vt } = await supabase
        .from('voice_transcripts')
        .select('speaker_type, text, timestamp')
        .eq('voice_session_id', vs.id)
        .order('timestamp', { ascending: true });
      voiceTranscripts = (vt ?? []) as typeof voiceTranscripts;
    }
  }

  const deals = contactId
    ? await supabase.from('deals').select('id, title, stage, value_cents, created_at').eq('contact_id', contactId).order('created_at', { ascending: false }).limit(10)
    : { data: [] };
  const tickets = await supabase
    .from('support_tickets')
    .select('id, title, status, priority, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(10);

  const userIds = [...new Set((membersRes.data ?? []).map((m: { user_id: string }) => m.user_id))];
  const { data: profiles } = userIds.length > 0 ? await supabase.from('profiles').select('id, full_name').in('id', userIds) : { data: [] };
  const members = (profiles ?? []).map((p: { id: string; full_name: string | null }) => ({ id: p.id, name: p.full_name || p.id }));

  const t = await getTranslations('dashboard');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/inbox" className="text-muted-foreground hover:text-foreground">
          ← {t('inbox')}
        </Link>
      </div>

      <InboxDetailClient
        conversationId={conversationId}
        conversation={conversation as Record<string, unknown>}
        messages={messagesRes.data ?? []}
        notes={notesRes.data ?? []}
        tags={tagsRes.data ?? []}
        assignments={assignmentsRes.data ?? []}
        events={eventsRes.data ?? []}
        lead={lead}
        contact={contact}
        deals={deals.data ?? []}
        tickets={tickets.data ?? []}
        members={members}
        voiceSession={voiceSession}
        voiceTranscripts={voiceTranscripts}
      />
    </div>
  );
}
