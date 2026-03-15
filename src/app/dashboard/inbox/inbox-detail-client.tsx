'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ui/use-toast';
import { formatDate } from '@/lib/utils';

type Message = { id: string; role: string; content: string; created_at: string };
type Note = { id: string; author_id: string; content: string; created_at: string };
type Tag = { id: string; tag: string; created_at: string };
type Event = { id: string; event_type: string; metadata: unknown; actor_id: string | null; created_at: string };

export function InboxDetailClient({
  conversationId,
  conversation,
  messages,
  notes,
  tags,
  assignments,
  events,
  lead,
  contact,
  deals,
  tickets,
  members,
  voiceSession,
  voiceTranscripts,
}: {
  conversationId: string;
  conversation: Record<string, unknown>;
  messages: Message[];
  notes: Note[];
  tags: Tag[];
  assignments: unknown[];
  events: Event[];
  lead: unknown;
  contact: unknown;
  deals: unknown[];
  tickets: unknown[];
  members: { id: string; name: string }[];
  voiceSession?: { id: string; started_at: string; ended_at: string | null; duration_seconds: number | null; transcript_summary: string | null } | null;
  voiceTranscripts?: { speaker_type: string; text: string; timestamp: string }[];
}) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const { toast } = useToast();
  const [replyContent, setReplyContent] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [newTag, setNewTag] = useState('');
  const [loadingReply, setLoadingReply] = useState(false);
  const [loadingNote, setLoadingNote] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [status, setStatus] = useState(String(conversation.status ?? 'open'));
  const [priority, setPriority] = useState(String(conversation.priority ?? 'normal'));
  const [assigneeId, setAssigneeId] = useState<string | null>(assignments?.[0] ? (assignments[0] as { assignee_id: string }).assignee_id : null);
  const [leadsList, setLeadsList] = useState<{ id: string; name: string | null; email: string | null }[]>([]);
  const [contactsList, setContactsList] = useState<{ id: string; name: string | null; email: string | null }[]>([]);

  const currentTags = tags.map((x) => x.tag);

  useEffect(() => {
    Promise.all([
      fetch('/api/inbox/leads?limit=100').then((r) => r.json()),
      fetch('/api/inbox/contacts?limit=100').then((r) => r.json()),
    ]).then(([leadsRes, contactsRes]) => {
      if (leadsRes.leads) setLeadsList(leadsRes.leads);
      if (contactsRes.contacts) setContactsList(contactsRes.contacts);
    });
  }, []);

  async function handleReply() {
    if (!replyContent.trim()) return;
    setLoadingReply(true);
    try {
      const res = await fetch(`/api/inbox/conversations/${conversationId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setReplyContent('');
      toast({ title: 'Sent', description: 'Reply sent.' });
      router.refresh();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to send', variant: 'destructive' });
    } finally {
      setLoadingReply(false);
    }
  }

  async function handleAddNote() {
    if (!noteContent.trim()) return;
    setLoadingNote(true);
    try {
      const res = await fetch(`/api/inbox/conversations/${conversationId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setNoteContent('');
      toast({ title: 'Note added' });
      router.refresh();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    } finally {
      setLoadingNote(false);
    }
  }

  async function handleAddTag() {
    if (!newTag.trim()) return;
    try {
      const res = await fetch(`/api/inbox/conversations/${conversationId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: newTag.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed');
      }
      setNewTag('');
      toast({ title: 'Tag added' });
      router.refresh();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    }
  }

  async function handleRemoveTag(tag: string) {
    try {
      const res = await fetch(`/api/inbox/conversations/${conversationId}/tags?tag=${encodeURIComponent(tag)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      router.refresh();
    } catch {
      toast({ title: 'Error', description: 'Failed to remove tag', variant: 'destructive' });
    }
  }

  async function handleGenerateDraft() {
    setLoadingDraft(true);
    try {
      const res = await fetch(`/api/inbox/conversations/${conversationId}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setReplyContent(data.draft ?? '');
      toast({ title: 'Draft generated' });
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    } finally {
      setLoadingDraft(false);
    }
  }

  async function handleEscalate() {
    try {
      const res = await fetch(`/api/inbox/conversations/${conversationId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Escalated from inbox' }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed');
      }
      toast({ title: 'Escalated' });
      router.refresh();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    }
  }

  async function handleAssign() {
    if (!assigneeId) return;
    try {
      const res = await fetch(`/api/inbox/conversations/${conversationId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed');
      }
      toast({ title: 'Assigned' });
      router.refresh();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    }
  }

  async function handleUpdateState(field: 'status' | 'priority', value: string) {
    try {
      const res = await fetch(`/api/inbox/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed');
      }
      if (field === 'status') setStatus(value);
      else setPriority(value);
      router.refresh();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    }
  }

  async function handleLinkLead(leadIdToLink: string | null) {
    try {
      const res = await fetch(`/api/inbox/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadIdToLink || null }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed');
      }
      toast({ title: leadIdToLink ? 'Lead linked' : 'Lead unlinked' });
      router.refresh();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    }
  }

  async function handleLinkContact(contactIdToLink: string | null) {
    try {
      const res = await fetch(`/api/inbox/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactIdToLink || null }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed');
      }
      toast({ title: contactIdToLink ? 'Contact linked' : 'Contact unlinked' });
      router.refresh();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed', variant: 'destructive' });
    }
  }

  const eventLabel: Record<string, string> = {
    ai_replied: 'AI replied',
    human_replied: 'Human replied',
    escalated: 'Escalated',
    assigned: 'Assigned',
    lead_created: 'Lead created',
    ticket_created: 'Ticket created',
    booking_created: 'Booking created',
    voice_call_started: 'Voice started',
    voice_call_ended: 'Voice ended',
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,340px]">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{status}</Badge>
              <Badge variant="outline">{priority}</Badge>
              {(conversation.channel_type as string) === 'voice_browser' && (
                <Badge variant="secondary">Voice</Badge>
              )}
              {(conversation.metadata as { handoff?: boolean })?.handoff && (
                <Badge variant="destructive">{t('escalated')}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {voiceSession && (
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground">Voice call</p>
                <p className="mt-1 text-sm">
                  {voiceSession.duration_seconds != null
                    ? `${Math.floor(voiceSession.duration_seconds / 60)}:${(voiceSession.duration_seconds % 60).toString().padStart(2, '0')}`
                    : '—'}
                  {voiceSession.transcript_summary && (
                    <span className="mt-2 block text-muted-foreground">{voiceSession.transcript_summary}</span>
                  )}
                </p>
                {(voiceTranscripts?.length ?? 0) > 0 && (
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
                    {voiceTranscripts!.map((seg, i) => (
                      <li key={i} className={seg.speaker_type === 'user' ? 'text-muted-foreground' : ''}>
                        <span className="font-medium">{seg.speaker_type === 'user' ? 'Visitor' : 'AI'}:</span> {seg.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-lg px-3 py-2 text-sm ${
                  m.role === 'user' ? 'bg-muted/60' : 'bg-primary/10'
                }`}
              >
                <span className="text-xs text-muted-foreground">
                  {m.role === 'user' ? 'Visitor' : 'Assistant'} · {formatDate(m.created_at)}
                </span>
                <p className="mt-1 whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('replyAsHuman')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Type your reply..."
              className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={4}
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleReply} disabled={loadingReply || !replyContent.trim()}>
                {loadingReply ? 'Sending…' : 'Send reply'}
              </Button>
              <Button variant="outline" onClick={handleGenerateDraft} disabled={loadingDraft}>
                {loadingDraft ? 'Generating…' : t('generateDraft')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">State</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <label className="text-xs text-muted-foreground">{t('status')}</label>
              <select
                value={status}
                onChange={(e) => handleUpdateState('status', e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              >
                <option value="open">{t('open')}</option>
                <option value="closed">{t('closed')}</option>
                <option value="snoozed">{t('snoozed')}</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('priority')}</label>
              <select
                value={priority}
                onChange={(e) => handleUpdateState('priority', e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              >
                <option value="low">{t('low')}</option>
                <option value="normal">{t('normal')}</option>
                <option value="high">{t('high')}</option>
              </select>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => handleUpdateState('status', 'closed')}>
              {t('markResolved')}
            </Button>
            <Button variant="outline" size="sm" className="w-full" onClick={handleEscalate}>
              {t('escalated')} (mark for human)
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('assign')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <select
              value={assigneeId ?? ''}
              onChange={(e) => setAssigneeId(e.target.value || null)}
              className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <Button size="sm" className="w-full" onClick={handleAssign} disabled={!assigneeId}>
              Assign
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-1">
              {currentTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                  {tag} ×
                </Badge>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag"
                className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <Button size="sm" onClick={handleAddTag} disabled={!newTag.trim()}>
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('internalNotes')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="rounded border border-border bg-muted/30 px-2 py-1.5 text-sm">
                <p className="text-xs text-muted-foreground">{formatDate(n.created_at)}</p>
                <p className="whitespace-pre-wrap">{n.content}</p>
              </div>
            ))}
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Add internal note..."
              className="min-h-[60px] w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
              rows={2}
            />
            <Button size="sm" onClick={handleAddNote} disabled={loadingNote || !noteContent.trim()}>
              {loadingNote ? 'Adding…' : t('addNote')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('timeline')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-xs">
              {events.slice(0, 20).map((ev) => (
                <li key={ev.id} className="text-muted-foreground">
                  {formatDate(ev.created_at)} · {eventLabel[ev.event_type] ?? ev.event_type}
                </li>
              ))}
              {events.length === 0 && <li className="text-muted-foreground">No events yet.</li>}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('crmContext')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Lead</p>
              {lead ? (
                <>
                  <p className="text-muted-foreground">
                    {(lead as { name?: string }).name} · {(lead as { email?: string }).email}
                  </p>
                  <Button variant="ghost" size="sm" className="mt-1 h-7 text-xs" onClick={() => handleLinkLead(null)}>
                    {t('unlinkLead')}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">No lead linked</p>
                  <select
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                    value=""
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v) handleLinkLead(v);
                    }}
                  >
                    <option value="">{t('linkLead')}</option>
                    {leadsList.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name || l.email || l.id}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
            <div>
              <p className="font-medium">Contact</p>
              {contact ? (
                <>
                  <p className="text-muted-foreground">
                    {(contact as { name?: string }).name} · {(contact as { email?: string })?.email ?? '—'}
                  </p>
                  <Button variant="ghost" size="sm" className="mt-1 h-7 text-xs" onClick={() => handleLinkContact(null)}>
                    {t('unlinkContact')}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground">No contact linked</p>
                  <select
                    className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                    value=""
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v) handleLinkContact(v);
                    }}
                  >
                    <option value="">{t('linkContact')}</option>
                    {contactsList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || c.email || c.id}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
            {deals.length > 0 && (
              <div>
                <p className="font-medium">Deals</p>
                <ul className="list-inside list-disc text-muted-foreground">
                  {(deals as { id: string; title: string; stage: string }[]).map((d) => (
                    <li key={d.id}>
                      {d.title} ({d.stage})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {tickets.length > 0 && (
              <div>
                <p className="font-medium">Tickets</p>
                <ul className="list-inside list-disc text-muted-foreground">
                  {(tickets as { id: string; title: string; status: string }[]).map((tk) => (
                    <li key={tk.id}>
                      {tk.title} ({tk.status})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
