'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Sparkles, Mail, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  SimplePageHeader,
  SimpleAiAssistPanel,
  SimpleEmptyState,
  SimpleDeveloperModeLink,
} from '@/components/dashboard/simple';
import { useViewMode } from '@/contexts/view-mode-context';
import { formatDate } from '@/lib/utils';

type Conversation = {
  id: string;
  status: string;
  priority?: string;
  lead_id: string | null;
  created_at: string;
  updated_at: string;
  escalated?: boolean;
};

export function SimpleConversationsPage() {
  const router = useRouter();
  const { setMode } = useViewMode();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const openInDeveloperMode = (path: string) => {
    setMode('developer');
    router.push(path);
  };

  useEffect(() => {
    let cancelled = false;
    fetch('/api/inbox/conversations?limit=30')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setConversations(data.conversations ?? []);
      })
      .catch(() => {
        if (!cancelled) setConversations([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openCount = conversations.filter((c) => c.status === 'open').length;

  return (
    <div className="space-y-8">
      <SimplePageHeader
        title="Conversations"
        description="Recent chats with visitors. See what’s open, what needs follow-up, and attach a conversation to a lead."
        icon={<MessageSquare className="h-6 w-6" />}
      />

      {/* Manual actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open conversation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">View the full chat and reply.</p>
            <Button variant="outline" size="sm" onClick={() => openInDeveloperMode('/dashboard/inbox')}>
              Open inbox
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Mark reviewed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Mark conversations as reviewed in the inbox.</p>
            <Button variant="outline" size="sm" onClick={() => openInDeveloperMode('/dashboard/inbox')}>
              Open inbox
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Create lead</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Turn a conversation into a lead from the inbox.</p>
            <Button variant="outline" size="sm" onClick={() => openInDeveloperMode('/dashboard/inbox')}>
              Open inbox
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Add note</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Add internal notes to conversations in the inbox.</p>
            <Button variant="outline" size="sm" onClick={() => openInDeveloperMode('/dashboard/inbox')}>
              Open inbox
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Conversation list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent conversations</CardTitle>
          <CardDescription>
            {loading ? 'Loading…' : conversations.length === 0 ? 'No conversations yet. They’ll appear when visitors chat.' : `${conversations.length} conversation(s). ${openCount} open. Open in Developer Mode for full inbox.`}
          </CardDescription>
        </CardHeader>
        {!loading && conversations.length > 0 && (
          <CardContent>
            <ul className="space-y-2">
              {conversations.slice(0, 15).map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Conversation</span>
                      <Badge variant={c.status === 'open' ? 'default' : 'secondary'} className="text-xs">
                        {c.status}
                      </Badge>
                      {c.lead_id && <Badge variant="outline" className="text-xs">Has lead</Badge>}
                      {c.escalated && <Badge variant="destructive" className="text-xs">Needs attention</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated {formatDate(c.updated_at)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openInDeveloperMode(`/dashboard/inbox/${c.id}`)}>
                    Open
                  </Button>
                </li>
              ))}
            </ul>
            {conversations.length > 15 && (
              <p className="mt-3 text-sm text-muted-foreground">+{conversations.length - 15} more in inbox</p>
            )}
          </CardContent>
        )}
        {!loading && conversations.length === 0 && (
          <CardContent>
            <SimpleEmptyState
              icon={<MessageSquare className="h-10 w-10" />}
              title="No conversations yet"
              description="Conversations appear when visitors use your chat widget. Make sure your assistant is installed and live."
              action={{ label: 'Open inbox', onClick: () => openInDeveloperMode('/dashboard/inbox') }}
              showDeveloperModeSwitch={true}
            />
          </CardContent>
        )}
      </Card>

      <SimpleAiAssistPanel
        title="AI can help"
        description="Summarize a conversation, detect intent, or suggest a reply."
        actions={[
          { label: 'Summarize conversation', onClick: () => openInDeveloperMode('/dashboard/inbox') },
          { label: 'Detect customer intent', onClick: () => openInDeveloperMode('/dashboard/inbox') },
          { label: 'Suggest reply', onClick: () => openInDeveloperMode('/dashboard/inbox') },
        ]}
      />

      <SimpleDeveloperModeLink developerPath="/dashboard/conversations" linkLabel="Open Inbox in Developer Mode" />
    </div>
  );
}
