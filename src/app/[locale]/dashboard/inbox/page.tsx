import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTranslations } from 'next-intl/server';
import { InboxListClient } from '@/app/dashboard/inbox/inbox-list-client';
import { getPlanAccess } from '@/lib/plan-access';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { UpgradeRequiredCard } from '@/components/upgrade-required-card';

export const dynamic = 'force-dynamic';

export default async function InboxPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');
  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const planAccess = await getPlanAccess(supabase, orgId, adminAllowed);
  if (!planAccess.featureAccess.inbox) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('inbox')}</h1>
          <p className="text-muted-foreground">{t('inboxDescription')}</p>
        </div>
        <UpgradeRequiredCard
          featureKey="inbox"
          currentPlanName={planAccess.planName}
          from="inbox"
        />
      </div>
    );
  }

  const { data: widgets } = await supabase.from('widgets').select('id, agent_id').eq('organization_id', orgId);
  const widgetIds = (widgets ?? []).map((w) => w.id);

  const conversations = widgetIds.length
    ? await supabase
        .from('conversations')
        .select('id, widget_id, visitor_id, channel_type, status, priority, lead_id, contact_id, created_at, updated_at, metadata')
        .in('widget_id', widgetIds)
        .order('updated_at', { ascending: false })
        .limit(100)
    : { data: [] };

  const convIds = (conversations.data ?? []).map((c) => c.id);
  const [assignmentsRes, tagsRes, escalationRes, membersRes] = await Promise.all([
    convIds.length > 0
      ? supabase
          .from('conversation_assignments')
          .select('conversation_id, assignee_id, assigned_at')
          .in('conversation_id', convIds)
          .order('assigned_at', { ascending: false })
      : { data: [] },
    convIds.length > 0 ? supabase.from('conversation_tags').select('conversation_id, tag').in('conversation_id', convIds) : { data: [] },
    convIds.length > 0 ? supabase.from('escalation_events').select('conversation_id').in('conversation_id', convIds).eq('status', 'pending') : { data: [] },
    supabase.from('organization_members').select('user_id').eq('organization_id', orgId),
  ]);

  const latestAssignmentByConv = new Map<string, { assignee_id: string; assigned_at: string }>();
  (assignmentsRes.data ?? []).forEach((a: { conversation_id: string; assignee_id: string; assigned_at: string }) => {
    if (!latestAssignmentByConv.has(a.conversation_id)) latestAssignmentByConv.set(a.conversation_id, { assignee_id: a.assignee_id, assigned_at: a.assigned_at });
  });
  const tagsByConv = new Map<string, string[]>();
  (tagsRes.data ?? []).forEach((t: { conversation_id: string; tag: string }) => {
    const arr = tagsByConv.get(t.conversation_id) ?? [];
    arr.push(t.tag);
    tagsByConv.set(t.conversation_id, arr);
  });
  const escalatedSet = new Set((escalationRes.data ?? []).map((e: { conversation_id: string }) => e.conversation_id));

  const userIds = [...new Set((membersRes.data ?? []).map((m: { user_id: string }) => m.user_id))];
  const { data: profiles } = userIds.length > 0 ? await supabase.from('profiles').select('id, full_name').in('id', userIds) : { data: [] };
  const userById = new Map((profiles ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name || p.id]));

  const widgetById = new Map((widgets ?? []).map((w) => [w.id, w]));
  const list = (conversations.data ?? []).map((c) => {
    const w = widgetById.get(c.widget_id);
    return {
      ...c,
      agent_id: (w as { agent_id?: string })?.agent_id ?? null,
      assignee_id: latestAssignmentByConv.get(c.id)?.assignee_id ?? null,
      assigned_at: latestAssignmentByConv.get(c.id)?.assigned_at ?? null,
      assignee_name: latestAssignmentByConv.get(c.id) ? userById.get(latestAssignmentByConv.get(c.id)!.assignee_id) ?? null : null,
      tags: tagsByConv.get(c.id) ?? [],
      escalated: escalatedSet.has(c.id),
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('inbox')}</h1>
        <p className="text-muted-foreground">{t('inboxDescription')}</p>
      </div>

      <InboxListClient
        initialConversations={list}
        members={Array.from(userById.entries()).map(([id, name]) => ({ id, name: String(name) }))}
      />
    </div>
  );
}
