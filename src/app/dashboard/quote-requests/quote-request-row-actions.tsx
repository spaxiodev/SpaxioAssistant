'use client';

import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

type QuoteRequestRowActionsProps = { quoteRequestId: string };

export function QuoteRequestRowActions({ quoteRequestId }: QuoteRequestRowActionsProps) {
  const router = useRouter();
  const { toast } = useToast();

  async function handleDelete() {
    if (!confirm('Delete this quote request? This cannot be undone.')) return;
    const supabase = createClient();
    const { error } = await supabase.from('quote_requests').delete().eq('id', quoteRequestId);
    if (error) {
      toast({
        title: 'Delete failed',
        description: error.message || error.details || 'Unknown error',
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Deleted', description: 'Quote request removed.' });
    router.refresh();
  }

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleDelete} title="Delete quote request">
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
