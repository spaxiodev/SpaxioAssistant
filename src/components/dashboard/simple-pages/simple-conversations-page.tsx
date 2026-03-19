'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  SimplePageHeader,
  SimpleEmptyState,
  SimpleDeveloperModeLink,
  BlockingGuidancePanel,
  MilestoneSuccessPanel,
  SimpleSetupSkeleton,
} from '@/components/dashboard/simple';
import { useViewMode } from '@/contexts/view-mode-context';
import { useNextBestAction } from '@/hooks/use-next-best-action';
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
  const { data: nextActionData, isLoading: loadingNextAction } = useNextBestAction();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const widgetReady = nextActionData?.progress?.widgetReadyDone ?? true;
  const showBlocking = !loadingNextAction && !loading && !widgetReady;

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
        description="Chats with visitors. Open a conversation to read the full thread and reply."
        icon={<MessageSquare className="h-6 w-6" />}
      />

      {showBlocking && (
        <BlockingGuidancePanel
          title="Install your assistant first"
          description="Conversations appear when visitors chat with your assistant. Set up your assistant in AI Setup and install the widget on your website."
          primaryAction={{ label: 'Go to AI Setup', href: '/dashboard/ai-setup' }}
          secondaryAction={{ label: 'Install widget', href: '/dashboard/install' }}
          icon={MessageSquare}
        />
      )}

      {!showBlocking && (
        <>
          {conversations.length === 1 && (
            <MilestoneSuccessPanel
              headline="First conversation!"
              description="A visitor has chatted with your assistant. Open it to see the full thread and reply."
              nextStep={{ label: 'View conversation', href: '/dashboard/conversations' }}
            />
          )}
          {/* Conversation list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent conversations</CardTitle>
          <CardDescription>
            {loading
              ? 'Loading…'
              : conversations.length === 0
                ? 'Conversations appear when visitors use your chat. Make sure your assistant is installed.'
                : `${conversations.length} conversation(s), ${openCount} open`}
          </CardDescription>
        </CardHeader>
        {loading && (
          <CardContent className="py-8">
            <SimpleSetupSkeleton lines={5} />
          </CardContent>
        )}
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
                      {c.lead_id && (
                        <Badge variant="outline" className="text-xs">
                          Has lead
                        </Badge>
                      )}
                      {c.escalated && (
                        <Badge variant="destructive" className="text-xs">
                          Needs attention
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Updated {formatDate(c.updated_at)}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openInDeveloperMode(`/dashboard/inbox/${c.id}`)}>
                    Open
                  </Button>
                </li>
              ))}
            </ul>
            {conversations.length > 15 && (
              <p className="mt-3 text-sm text-muted-foreground">+{conversations.length - 15} more</p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => openInDeveloperMode('/dashboard/inbox')}
            >
              Open full inbox
            </Button>
          </CardContent>
        )}
        {!loading && conversations.length === 0 && (
          <CardContent>
            <SimpleEmptyState
              icon={<MessageSquare className="h-10 w-10" />}
              title="No conversations yet"
              description="When visitors chat with your assistant, conversations will appear here. Install your widget to start receiving chats."
              action={{
                label: 'Install my widget',
                onClick: () => router.push('/dashboard/install'),
              }}
              secondaryAction={{
                label: 'Go to AI Setup',
                onClick: () => router.push('/dashboard/ai-setup'),
              }}
              showDeveloperModeSwitch={true}
            />
          </CardContent>
        )}
      </Card>
        </>
      )}

      <SimpleDeveloperModeLink
        developerPath="/dashboard/conversations"
        linkLabel="Open Inbox in Developer Mode"
      />
    </div>
  );
}
