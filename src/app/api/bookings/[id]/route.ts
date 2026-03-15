import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';
import { isUuid, normalizeUuid } from '@/lib/validation';
import { canUseBookings } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/bookings/:id */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await context.params;
    const bookingId = normalizeUuid(id);
    if (!isUuid(bookingId)) return NextResponse.json({ error: 'Invalid booking id' }, { status: 400 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    if (!(await canUseBookings(supabase, organizationId, adminAllowed))) {
      return NextResponse.json({ error: 'Bookings not enabled' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err, 'bookings/GET/:id');
  }
}

/** PATCH /api/bookings/:id - update status, title, etc. */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await context.params;
    const bookingId = normalizeUuid(id);
    if (!isUuid(bookingId)) return NextResponse.json({ error: 'Invalid booking id' }, { status: 400 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    if (!(await canUseBookings(supabase, organizationId, adminAllowed))) {
      return NextResponse.json({ error: 'Bookings not enabled' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, unknown> = {};
    if (typeof body.title === 'string') updates.title = body.title.slice(0, 500);
    if (typeof body.status === 'string' && ['scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'].includes(body.status)) updates.status = body.status;
    if (typeof body.description === 'string') updates.description = body.description.slice(0, 2000);
    if (body.startAt) updates.start_at = body.startAt;
    if (body.endAt) updates.end_at = body.endAt;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err, 'bookings/PATCH/:id');
  }
}

/** DELETE /api/bookings/:id - cancel (set status cancelled) or hard delete */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { id } = await context.params;
    const bookingId = normalizeUuid(id);
    if (!isUuid(bookingId)) return NextResponse.json({ error: 'Invalid booking id' }, { status: 400 });

    const supabase = createAdminClient();
    const adminAllowed = await isOrgAllowedByAdmin(supabase, organizationId);
    if (!(await canUseBookings(supabase, organizationId, adminAllowed))) {
      return NextResponse.json({ error: 'Bookings not enabled' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const cancelOnly = searchParams.get('cancel') === 'true';

    if (cancelOnly) {
      const { data, error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)
        .eq('organization_id', organizationId)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json(data);
    }

    const { error } = await supabase.from('bookings').delete().eq('id', bookingId).eq('organization_id', organizationId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return handleApiError(err, 'bookings/DELETE/:id');
  }
}
