'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
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

type LeadRowActionsProps = { leadId: string };

export function LeadRowActions({ leadId }: LeadRowActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('dashboard');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteConfirm() {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from('leads').delete().eq('id', leadId);
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
    toast({ title: t('deleted'), description: t('leadRemoved') });
    router.refresh();
  }

  return (
    <>
      <Button
        variant="destructive"
        size="icon"
        className="h-8 w-8"
        onClick={() => setShowDeleteConfirm(true)}
        title="Delete lead"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('deleteLeadTitle')}</DialogTitle>
            <DialogDescription>{t('deleteLeadDescription')}</DialogDescription>
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
