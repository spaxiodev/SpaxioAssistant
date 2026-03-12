import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { ConversationActions } from '../../../dashboard/conversations/conversation-actions';
import { getTranslations } from 'next-intl/server';

export default async function ConversationsPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');

  const { data: widgets } = await supabase.from('widgets').select('id').eq('organization_id', orgId);
  const widgetIds = (widgets ?? []).map((w) => w.id);

  const { data: conversations } = widgetIds.length
    ? await supabase
        .from('conversations')
        .select('id, visitor_id, created_at, updated_at')
        .in('widget_id', widgetIds)
        .order('updated_at', { ascending: false })
        .limit(50)
    : { data: [] };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('conversationsTitle')}</h1>
        <p className="text-muted-foreground">{t('conversationsDescription')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('recentChats')}</CardTitle>
          <CardDescription>{t('recentChatsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {!conversations?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('noConversations')}</p>
          ) : (
            <ul className="divide-y divide-border">
              {conversations.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm text-muted-foreground">
                      {c.visitor_id || t('anonymous')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('started')} {formatDate(c.created_at)} · {t('updated')} {formatDate(c.updated_at)}
                    </p>
                  </div>
                  <ConversationActions
                    conversationId={c.id}
                    visitorId={c.visitor_id}
                    createdAt={c.created_at}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
