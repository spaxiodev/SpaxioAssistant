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

type QuoteRequestRowActionsProps = { quoteRequestId: string };

export function QuoteRequestRowActions({ quoteRequestId }: QuoteRequestRowActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('dashboard');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteConfirm() {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from('quote_requests').delete().eq('id', quoteRequestId);
    setDeleting(false);
    if (error) {
      toast({
        title: t('deleteFailed'),
        description: error.message || error.details || 'Unknown error',
        variant: 'destructive',
      });
      return;
    }
    setShowDeleteConfirm(false);
    toast({ title: t('deleted'), description: t('quoteRequestRemoved') });
    router.refresh();
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        onClick={() => setShowDeleteConfirm(true)}
        title="Delete quote request"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('deleteQuoteRequestTitle')}</DialogTitle>
            <DialogDescription>{t('deleteQuoteRequestDescription')}</DialogDescription>
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
