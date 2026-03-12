'use client';

import { useRouter } from 'next/navigation';
import { Download, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

type ConversationActionsProps = {
  conversationId: string;
  visitorId: string | null;
  createdAt: string;
};

export function ConversationActions({
  conversationId,
  visitorId,
  createdAt,
}: ConversationActionsProps) {
  const router = useRouter();
  const { toast } = useToast();

  async function handleDownload() {
    const supabase = createClient();
    const { data: messages, error } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    const dateStr = new Date(createdAt).toISOString().slice(0, 10);
    const visitor = visitorId || 'Anonymous';
    const lines = (messages ?? []).map((m) => {
      const time = new Date(m.created_at).toLocaleTimeString();
      const label = m.role === 'user' ? 'Visitor' : 'Assistant';
      return `[${time}] ${label}: ${m.content}`;
    });
    const text = `Chat transcript — ${visitor} — ${dateStr}\n${'─'.repeat(50)}\n\n${lines.join('\n\n')}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${visitor.replace(/[^a-zA-Z0-9-_]/g, '_')}-${dateStr}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Downloaded', description: 'Chat saved as text file.' });
  }

  async function handleDelete() {
    if (!confirm('Delete this conversation and all its messages? This cannot be undone.')) return;
    const supabase = createClient();
    const { error } = await supabase.from('conversations').delete().eq('id', conversationId);
    if (error) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Deleted', description: 'Conversation removed.' });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload} title="Download chat">
        <Download className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleDelete} title="Delete conversation">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
