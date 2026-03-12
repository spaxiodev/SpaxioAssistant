'use client';

import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

type LeadRowActionsProps = { leadId: string };

export function LeadRowActions({ leadId }: LeadRowActionsProps) {
  const router = useRouter();
  const { toast } = useToast();

  async function handleDelete() {
    if (!confirm('Delete this lead? This cannot be undone.')) return;
    const supabase = createClient();
    const { error } = await supabase.from('leads').delete().eq('id', leadId);
    if (error) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Deleted', description: 'Lead removed.' });
    router.refresh();
  }

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleDelete} title="Delete lead">
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
