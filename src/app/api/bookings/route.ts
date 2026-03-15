import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';
import { canUseBookings } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';
import { createBooking } from '@/lib/bookings/service';

/**
 * GET /api/bookings
 * Query: limit, offset, from (date), to (date), status
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
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 100);
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);
    const from = searchParams.get('from')?.trim();
    const to = searchParams.get('to')?.trim();
    const status = searchParams.get('status')?.trim();

    let q = supabase
      .from('bookings')
      .select('id, organization_id, contact_id, lead_id, conversation_id, agent_id, title, start_at, end_at, timezone, status, source, created_at', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('start_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (from) q = q.gte('start_at', from);
    if (to) q = q.lte('start_at', to);
    if (status) q = q.eq('status', status);

    const { data, error, count } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bookings: data ?? [], total: count ?? 0 });
  } catch (err) {
    return handleApiError(err, 'bookings/GET');
  }
}

/**
 * POST /api/bookings
 * Body: { title, startAt, endAt, timezone?, contactId?, leadId?, description? }
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
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 500) : 'Appointment';
    const startAt = typeof body.startAt === 'string' ? body.startAt : '';
    const endAt = typeof body.endAt === 'string' ? body.endAt : '';
    const timezone = typeof body.timezone === 'string' ? body.timezone.slice(0, 64) : 'UTC';
    const contactId = body.contactId != null ? String(body.contactId).trim() : undefined;
    const leadId = body.leadId != null ? String(body.leadId).trim() : undefined;
    const description = typeof body.description === 'string' ? body.description.slice(0, 2000) : undefined;

    if (!startAt || !endAt) {
      return NextResponse.json({ error: 'startAt and endAt required' }, { status: 400 });
    }

    const result = await createBooking(supabase, {
      organizationId,
      title,
      startAt,
      endAt,
      timezone,
      contactId: contactId || undefined,
      leadId: leadId || undefined,
      description,
      source: 'manual',
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, bookingId: result.bookingId });
  } catch (err) {
    return handleApiError(err, 'bookings/POST');
  }
}
