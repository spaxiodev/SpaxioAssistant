'use client';

import { useRouter } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

type SessionRow = {
  id: string;
  conversationId: string | null;
  agentId: string | null;
  agentName: string | null;
  sourceType: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  transcriptSummary: string | null;
  createdAt: string;
};

export function VoiceSessionsClient({ sessions }: { sessions: SessionRow[] }) {
  const router = useRouter();

  function formatDuration(sec: number | null): string {
    if (sec == null) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Voice session history</CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No voice sessions yet. Sessions appear when visitors use the voice feature in the widget.</p>
        ) : (
          <ul className="divide-y divide-border">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{formatDate(s.startedAt)}</span>
                    <Badge variant="secondary">{s.status}</Badge>
                    <Badge variant="outline">{s.sourceType}</Badge>
                    {s.agentName && (
                      <span className="text-muted-foreground text-sm">{s.agentName}</span>
                    )}
                  </div>
                  {s.transcriptSummary && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{s.transcriptSummary}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{formatDuration(s.durationSeconds)}</span>
                  {s.conversationId && (
                    <button
                      type="button"
                      onClick={() => router.push(`/dashboard/inbox/${s.conversationId}`)}
                      className="text-primary hover:underline"
                    >
                      View in Inbox
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
