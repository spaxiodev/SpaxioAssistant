'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { formatDate } from '@/lib/utils';

type ConversationRow = {
  id: string;
  visitor_id: string | null;
  channel_type: string;
  status: string;
  priority: string;
  updated_at: string;
  assignee_id: string | null;
  assignee_name: string | null;
  tags: string[];
  escalated: boolean;
};

export function InboxListClient({
  initialConversations,
  members,
}: {
  initialConversations: ConversationRow[];
  members: { id: string; name: string }[];
}) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [conversations] = useState(initialConversations);

  const filtered =
    statusFilter === 'all'
      ? conversations
      : conversations.filter((c) => c.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="open">{t('open')}</option>
          <option value="closed">{t('closed')}</option>
          <option value="snoozed">{t('snoozed')}</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t('noInboxConversations')}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                className="flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                onClick={() => router.push(`/dashboard/inbox/${c.id}`)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm text-muted-foreground">
                    {c.visitor_id || t('anonymous')}
                  </span>
                  <div className="flex flex-wrap items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {c.status}
                    </Badge>
                    {(c.channel_type === 'voice_browser' || c.channel_type === 'voice_phone') && (
                      <Badge variant="outline" className="text-xs">
                        Voice
                      </Badge>
                    )}
                    {c.escalated && (
                      <Badge variant="destructive" className="text-xs">
                        {t('escalated')}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(c.updated_at)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {c.assignee_name && (
                    <span>{t('assign')}: {c.assignee_name}</span>
                  )}
                  {c.tags.length > 0 && (
                    <span>{c.tags.join(', ')}</span>
                  )}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
