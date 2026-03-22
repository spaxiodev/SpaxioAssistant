'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Loader2, Bot, User } from 'lucide-react';

type ConversationRow = {
  id: string;
  external_contact_identifier: string;
  status: string;
  language: string | null;
  ai_enabled: boolean;
  last_message_at: string;
};

type MessageRow = {
  id: string;
  direction: string;
  content: string | null;
  created_at: string;
  message_type: string;
  content_json?: Record<string, unknown> | null;
};

export function SmsInboxClient() {
  const t = useTranslations('dashboard');
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/dashboard/communications/conversations?channel=sms');
      const json = await res.json();
      setConversations(json.conversations ?? []);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    setLoadingThread(true);
    try {
      const res = await fetch(`/api/dashboard/communications/conversations/${id}/messages`);
      const json = await res.json();
      setMessages(json.messages ?? []);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId) void loadMessages(selectedId);
    else setMessages([]);
  }, [selectedId, loadMessages]);

  const selected = conversations.find((c) => c.id === selectedId);

  async function setConversationAiEnabled(enabled: boolean) {
    if (!selectedId) return;
    await fetch(`/api/dashboard/communications/conversations/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ai_enabled: enabled }),
    });
    await loadList();
  }

  async function sendManual() {
    if (!selectedId || !draft.trim() || !selected) return;
    setSending(true);
    try {
      const res = await fetch('/api/communications/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selected.external_contact_identifier,
          body: draft.trim(),
          conversationId: selectedId,
        }),
      });
      if (res.ok) {
        setDraft('');
        await loadMessages(selectedId);
        await loadList();
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid min-h-[480px] gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
      <div className="flex flex-col rounded-2xl border border-border/70 bg-card/40 shadow-sm">
        <div className="border-b border-border/60 px-3 py-3">
          <p className="text-sm font-semibold">{t('communicationsSmsThreads')}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loadingList ? (
            <div className="flex justify-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !conversations.length ? (
            <p className="p-3 text-sm text-muted-foreground">{t('communicationsNoThreads')}</p>
          ) : (
            <ul className="space-y-1">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      'w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                      selectedId === c.id
                        ? 'bg-[linear-gradient(135deg,hsl(var(--primary))/0.18,rgba(14,165,233,0.12))] text-foreground'
                        : 'hover:bg-muted/60'
                    )}
                  >
                    <span className="block truncate font-mono text-xs">{c.external_contact_identifier}</span>
                    <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      {c.ai_enabled === false ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {t('communicationsManual')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-primary/30 text-[10px] text-primary">
                          {t('communicationsAiOn')}
                        </Badge>
                      )}
                      {c.language && <span>{c.language.toUpperCase()}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-col rounded-2xl border border-border/70 bg-card/40 shadow-sm">
        {!selectedId ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
            {t('communicationsSelectThread')}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
              <div>
                <p className="font-mono text-sm">{selected?.external_contact_identifier}</p>
                <p className="text-xs text-muted-foreground">
                  {t('communicationsLastActivity')} {selected ? formatDate(selected.last_message_at) : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selected?.ai_enabled === false ? (
                  <Button size="sm" variant="outline" onClick={() => void setConversationAiEnabled(true)}>
                    <Bot className="mr-1 h-4 w-4" />
                    {t('communicationsResumeAi')}
                  </Button>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => void setConversationAiEnabled(false)}>
                    <User className="mr-1 h-4 w-4" />
                    {t('communicationsTakeOver')}
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {loadingThread ? (
                <div className="flex justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                messages.map((m) => {
                  const outboundMeta =
                    m.direction === 'outbound'
                      ? m.content_json?.ai === true
                        ? 'AI'
                        : m.content_json?.manual === true
                          ? 'Team'
                          : null
                      : null;
                  return (
                    <div
                      key={m.id}
                      className={cn(
                        'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                        m.direction === 'inbound'
                          ? 'ml-0 mr-auto bg-muted/80'
                          : m.direction === 'system'
                            ? 'mx-auto bg-amber-500/10 text-center text-xs text-amber-900 dark:text-amber-100'
                            : 'ml-auto mr-0 bg-primary/15'
                      )}
                    >
                      {outboundMeta && (
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {outboundMeta}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap">{m.content}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{formatDate(m.created_at)}</p>
                    </div>
                  );
                })
              )}
            </div>
            <div className="border-t border-border/60 p-3">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('communicationsSmsPlaceholder')}
                className="min-h-[88px] resize-none rounded-xl border-border/70 bg-background/80"
              />
              <div className="mt-2 flex justify-end">
                <Button size="sm" disabled={sending || !draft.trim()} onClick={() => void sendManual()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('communicationsSendSms')}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
