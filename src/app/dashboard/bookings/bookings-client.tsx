'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
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
import { Trash2, Loader2 } from 'lucide-react';

type Booking = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  timezone: string;
  status: string;
  source: string;
  created_at: string;
};

export function BookingsClient({ initialBookings }: { initialBookings: Booking[] }) {
  const t = useTranslations('dashboard');
  const { toast } = useToast();
  const [bookings, setBookings] = useState(initialBookings);
  const [loading, setLoading] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function refetch() {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings?limit=100');
      const data = await res.json();
      if (data.bookings) setBookings(data.bookings);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteBooking() {
    if (!bookingToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/bookings/${bookingToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ title: data.error ?? 'Failed to delete', variant: 'destructive' });
        return;
      }
      setBookings((prev) => prev.filter((b) => b.id !== bookingToDelete.id));
      setBookingToDelete(null);
      toast({ title: 'Booking deleted' });
    } finally {
      setDeleting(false);
    }
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {t('noBookings')}
          <p className="mt-2">Bookings created by the AI (e.g. &quot;Book me tomorrow at 2&quot;) or manually will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>
      <div className="grid gap-2">
        {bookings.map((b) => (
          <Card key={b.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{b.title}</span>
                <Badge variant="secondary">{b.status}</Badge>
                <Badge variant="outline" className="text-xs">
                  {b.source}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">
                  {new Date(b.start_at).toLocaleString()} – {new Date(b.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setBookingToDelete(b)}
                  title="Delete booking"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!bookingToDelete} onOpenChange={(open) => !open && setBookingToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete booking?</DialogTitle>
            <DialogDescription>
              Delete &quot;{bookingToDelete?.title}&quot;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" onClick={() => setBookingToDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteBooking} disabled={deleting}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
