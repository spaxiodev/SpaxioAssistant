/**
 * PATCH /api/ai-suggestions – Dismiss or complete a suggestion.
 * Body: { id: string; action: 'dismiss' | 'complete' | 'snooze' }
 */
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';
import { requireOrg } from '@/lib/api-org-auth';

export async function PATCH(request: Request) {
  try {
    const auth = await requireOrg();
    if (!auth.ok) return auth.response;
    const { organizationId, supabase } = auth;

    const body = await request.json() as { id?: string; action?: string };
    const { id, action } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }
    if (!action || !['dismiss', 'complete', 'snooze'].includes(action)) {
      return NextResponse.json({ error: 'action must be dismiss, complete, or snooze' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updated_at: now };

    if (action === 'dismiss') {
      updates.status = 'dismissed';
      updates.dismissed_at = now;
    } else if (action === 'complete') {
      updates.status = 'completed';
      updates.completed_at = now;
    } else if (action === 'snooze') {
      // Snooze for 3 days
      const snoozeUntil = new Date();
      snoozeUntil.setDate(snoozeUntil.getDate() + 3);
      updates.status = 'snoozed';
      updates.expires_at = snoozeUntil.toISOString();
    }

    const { error } = await supabase
      .from('ai_suggestions')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err, 'ai-suggestions');
  }
}
