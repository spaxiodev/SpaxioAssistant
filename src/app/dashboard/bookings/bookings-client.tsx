'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

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
  const [bookings, setBookings] = useState(initialBookings);
  const [loading, setLoading] = useState(false);

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
              <div className="text-sm text-muted-foreground">
                {new Date(b.start_at).toLocaleString()} – {new Date(b.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
