'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
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
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

type AgentDeleteButtonProps = {
  agentId: string;
  agentName: string;
};

export function AgentDeleteButton({ agentId, agentName }: AgentDeleteButtonProps) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDeleteConfirm() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to delete agent');
      }
      setShowDeleteConfirm(false);
      router.push('/dashboard/agents');
    } catch (err) {
      console.error(err);
      toast({
        title: t('deleteAgentError'),
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => setShowDeleteConfirm(true)}
        disabled={isDeleting}
        aria-label={t('deleteAgent')}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {t('deleteAgent')}
      </Button>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('deleteAgent')}</DialogTitle>
            <DialogDescription>{t('deleteAgentConfirm', { name: agentName })}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? '…' : t('deleteConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
