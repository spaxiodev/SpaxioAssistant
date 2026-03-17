'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('dashboard');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  async function handleDeleteConfirm() {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from('conversations').delete().eq('id', conversationId);
    setDeleting(false);
    if (error) {
      toast({
        title: t('deleteFailed'),
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    setShowDeleteConfirm(false);
    toast({ title: t('deleted'), description: t('conversationRemoved') });
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload} title="Download chat">
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="h-8 w-8"
          onClick={() => setShowDeleteConfirm(true)}
          title="Delete conversation"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('deleteConversationTitle')}</DialogTitle>
            <DialogDescription>{t('deleteConversationDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? '…' : t('deleteConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
