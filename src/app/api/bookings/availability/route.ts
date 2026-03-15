import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';
import {
  getAvailabilityWindows,
  getDefaultBookingDurationMinutes,
  getAvailableSlotsForDate,
  filterSlotsWithoutConflicts,
} from '@/lib/bookings/service';
import { canUseBookings } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';

/**
 * GET /api/bookings/availability
 * Query: date (YYYY-MM-DD) for slots; no date = return windows + default duration only
 */
export async function GET(request: Request) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    if (!(await canUseBookings(supabase, organizationId, adminAllowed))) {
      return NextResponse.json({ error: 'Bookings not enabled for your plan' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date')?.trim();

    const [windows, durationMinutes] = await Promise.all([
      getAvailabilityWindows(supabase, organizationId),
      getDefaultBookingDurationMinutes(supabase, organizationId),
    ]);

    const response: {
      windows: { id: string; day_of_week: number; start_time: string; end_time: string; timezone: string }[];
      defaultDurationMinutes: number;
      slots?: { start: string; end: string }[];
    } = {
      windows: windows.map((w) => ({
        id: w.id,
        day_of_week: w.day_of_week,
        start_time: w.start_time,
        end_time: w.end_time,
        timezone: w.timezone,
      })),
      defaultDurationMinutes: durationMinutes,
    };

    if (dateStr) {
      const slots = await getAvailableSlotsForDate(supabase, organizationId, dateStr, durationMinutes);
      const available = await filterSlotsWithoutConflicts(supabase, organizationId, slots);
      response.slots = available;
    }

    return NextResponse.json(response);
  } catch (err) {
    return handleApiError(err, 'bookings/availability');
  }
}

/**
 * POST /api/bookings/availability
 * Body: { windows: { day_of_week: number, start_time: string, end_time: string, timezone?: string }[] }
 * Replaces all availability windows for the org.
 */
export async function POST(request: Request) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    if (!(await canUseBookings(supabase, organizationId, adminAllowed))) {
      return NextResponse.json({ error: 'Bookings not enabled for your plan' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const raw = body.windows;
    if (!Array.isArray(raw)) {
      return NextResponse.json({ error: 'windows array required' }, { status: 400 });
    }

    await supabase.from('booking_availability').delete().eq('organization_id', organizationId);

    const toInsert = raw.slice(0, 50).map((w: { day_of_week?: number; start_time?: string; end_time?: string; timezone?: string }) => ({
      organization_id: organizationId,
      day_of_week: Math.min(6, Math.max(0, Number(w.day_of_week) ?? 0)),
      start_time: String(w.start_time ?? '09:00').slice(0, 8),
      end_time: String(w.end_time ?? '17:00').slice(0, 8),
      timezone: String(w.timezone ?? 'UTC').slice(0, 64),
    }));

    if (toInsert.length > 0) {
      const { error } = await supabase.from('booking_availability').insert(toInsert);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err, 'bookings/availability POST');
  }
}
