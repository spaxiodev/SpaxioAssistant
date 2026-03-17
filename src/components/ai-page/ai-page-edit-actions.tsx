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
import { Eye, EyeOff, Loader2, Trash2 } from 'lucide-react';

type Props = {
  pageId: string;
  pageTitle: string;
  isPublished: boolean;
};

export function AiPageEditActions({ pageId, pageTitle, isPublished }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [publishing, setPublishing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handlePublishToggle() {
    setPublishing(true);
    try {
      const res = await fetch(`/api/dashboard/ai-pages/${pageId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !isPublished }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || 'Failed to update', variant: 'destructive' });
        return;
      }
      toast({ title: data.page?.is_published ? 'Published' : 'Unpublished' });
      router.refresh();
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/dashboard/ai-pages/${pageId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || 'Failed to delete', variant: 'destructive' });
        return;
      }
      toast({ title: 'AI Page deleted' });
      setDeleteOpen(false);
      router.push('/dashboard/ai-pages');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={isPublished ? 'outline' : 'default'}
          size="sm"
          onClick={handlePublishToggle}
          disabled={publishing}
        >
          {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isPublished ? (
            <>
              <EyeOff className="mr-1 h-4 w-4" />
              Unpublish
            </>
          ) : (
            <>
              <Eye className="mr-1 h-4 w-4" />
              Publish
            </>
          )}
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="mr-1 h-4 w-4" />
          Delete
        </Button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent showClose className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete AI Page</DialogTitle>
            <DialogDescription>
              Delete &quot;{pageTitle}&quot;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
