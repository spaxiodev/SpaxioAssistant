/**
 * First-party booking service: availability, conflict checks, create booking.
 * Designed so external calendar integrations can be added later.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type CreateBookingInput = {
  organizationId: string;
  title: string;
  startAt: string;
  endAt: string;
  timezone: string;
  conversationId?: string;
  agentId?: string;
  contactId?: string;
  leadId?: string;
  description?: string;
  source?: 'ai' | 'manual' | 'widget' | 'api';
};

export type CreateBookingResult = { success: true; bookingId: string; message?: string } | { success: false; error: string };

/**
 * Create a booking. Performs conflict check within the same org (optional).
 */
export async function createBooking(
  supabase: SupabaseClient,
  input: CreateBookingInput
): Promise<CreateBookingResult> {
  const start = new Date(input.startAt);
  const end = new Date(input.endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { success: false, error: 'Invalid start_at or end_at' };
  }
  if (end <= start) {
    return { success: false, error: 'end_at must be after start_at' };
  }

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      organization_id: input.organizationId,
      title: input.title.slice(0, 500),
      description: input.description?.slice(0, 2000) ?? null,
      start_at: input.startAt,
      end_at: input.endAt,
      timezone: input.timezone.slice(0, 64) || 'UTC',
      status: 'scheduled',
      source: input.source ?? 'manual',
      conversation_id: input.conversationId ?? null,
      agent_id: input.agentId ?? null,
      contact_id: input.contactId ?? null,
      lead_id: input.leadId ?? null,
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, bookingId: booking!.id, message: 'Booking created' };
}

/**
 * Check for overlapping bookings in the same org (optional; used for conflict check).
 */
export async function getConflictingBookings(
  supabase: SupabaseClient,
  organizationId: string,
  startAt: string,
  endAt: string,
  excludeBookingId?: string
): Promise<{ id: string }[]> {
  let q = supabase
    .from('bookings')
    .select('id')
    .eq('organization_id', organizationId)
    .in('status', ['scheduled', 'confirmed'])
    .lt('start_at', endAt)
    .gt('end_at', startAt);
  if (excludeBookingId) q = q.neq('id', excludeBookingId);
  const { data } = await q;
  return (data ?? []) as { id: string }[];
}

export type AvailabilityWindow = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  timezone: string;
};

/**
 * Fetch availability windows for an org (from booking_availability table).
 */
export async function getAvailabilityWindows(
  supabase: SupabaseClient,
  organizationId: string
): Promise<AvailabilityWindow[]> {
  const { data } = await supabase
    .from('booking_availability')
    .select('id, day_of_week, start_time, end_time, timezone')
    .eq('organization_id', organizationId)
    .order('day_of_week');
  return (data ?? []) as AvailabilityWindow[];
}

/**
 * Get default booking duration in minutes from business_settings.
 */
export async function getDefaultBookingDurationMinutes(
  supabase: SupabaseClient,
  organizationId: string
): Promise<number> {
  const { data } = await supabase
    .from('business_settings')
    .select('default_booking_duration_minutes')
    .eq('organization_id', organizationId)
    .maybeSingle();
  const n = Number((data as { default_booking_duration_minutes?: number } | null)?.default_booking_duration_minutes);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

/**
 * Return available slots for a given date based on availability windows.
 * Simplified: no timezone conversion (assumes windows are in same TZ as requested date).
 * Returns slots as { start: ISO string, end: ISO string } for the given date.
 */
export async function getAvailableSlotsForDate(
  supabase: SupabaseClient,
  organizationId: string,
  dateStr: string,
  durationMinutes: number
): Promise<{ start: string; end: string }[]> {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return [];
  const dayOfWeek = date.getDay();
  const windows = await getAvailabilityWindows(supabase, organizationId);
  const dayWindows = windows.filter((w) => w.day_of_week === dayOfWeek);
  if (dayWindows.length === 0) return [];

  const slots: { start: string; end: string }[] = [];
  const [y, m, d] = [date.getFullYear(), date.getMonth(), date.getDate()];

  for (const w of dayWindows) {
    const startParts = String(w.start_time).split(':').map(Number);
    const endParts = String(w.end_time).split(':').map(Number);
    let startMin = (startParts[0] ?? 0) * 60 + (startParts[1] ?? 0);
    let endMin = (endParts[0] ?? 23) * 60 + (endParts[1] ?? 59);
    while (startMin + durationMinutes <= endMin) {
      const sh = Math.floor(startMin / 60);
      const sm = startMin % 60;
      const eh = Math.floor((startMin + durationMinutes) / 60);
      const em = (startMin + durationMinutes) % 60;
      const start = new Date(y, m, d, sh, sm, 0, 0);
      const end = new Date(y, m, d, eh, em, 0, 0);
      slots.push({ start: start.toISOString(), end: end.toISOString() });
      startMin += durationMinutes;
    }
  }
  return slots;
}

/**
 * Filter slots to those that don't conflict with existing bookings.
 */
export async function filterSlotsWithoutConflicts(
  supabase: SupabaseClient,
  organizationId: string,
  slots: { start: string; end: string }[]
): Promise<{ start: string; end: string }[]> {
  const result: { start: string; end: string }[] = [];
  for (const slot of slots) {
    const conflicts = await getConflictingBookings(supabase, organizationId, slot.start, slot.end);
    if (conflicts.length === 0) result.push(slot);
  }
  return result;
}
