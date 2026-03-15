import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { BookingsClient } from '@/app/dashboard/bookings/bookings-client';
import { getPlanAccess } from '@/lib/plan-access';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { UpgradeRequiredCard } from '@/components/upgrade-required-card';

export const dynamic = 'force-dynamic';

export default async function BookingsPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const t = await getTranslations('dashboard');
  const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
  const planAccess = await getPlanAccess(supabase, orgId, adminAllowed);
  if (!planAccess.featureAccess.bookings) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('bookings')}</h1>
          <p className="text-muted-foreground">{t('bookingsDescription')}</p>
        </div>
        <UpgradeRequiredCard
          featureKey="bookings"
          currentPlanName={planAccess.planName}
          from="bookings"
        />
      </div>
    );
  }

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, title, start_at, end_at, timezone, status, source, created_at')
    .eq('organization_id', orgId)
    .order('start_at', { ascending: false })
    .limit(100);

  const { data: windows } = await supabase
    .from('booking_availability')
    .select('id, day_of_week, start_time, end_time, timezone')
    .eq('organization_id', orgId)
    .order('day_of_week');

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('bookings')}</h1>
        <p className="text-muted-foreground">{t('bookingsDescription')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('availability')}</CardTitle>
          <CardDescription>{t('availabilityDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {!windows?.length ? (
            <p className="text-sm text-muted-foreground">No availability windows set. Add hours in Settings or use default business hours when using AI booking.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {windows.map((w) => (
                <li key={w.id}>
                  {dayNames[w.day_of_week as number]} {String(w.start_time)} – {String(w.end_time)} ({w.timezone})
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <BookingsClient
        initialBookings={(bookings ?? []) as { id: string; title: string; start_at: string; end_at: string; timezone: string; status: string; source: string; created_at: string }[]}
      />
    </div>
  );
}
