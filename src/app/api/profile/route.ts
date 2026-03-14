import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';
import { sanitizeText } from '@/lib/validation';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from('profiles')
      .select('id, full_name, avatar_url, updated_at')
      .eq('id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email ?? null,
      fullName: profile?.full_name ?? (user.user_metadata as { full_name?: string } | undefined)?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    });
  } catch (err) {
    return handleApiError(err, 'profile/GET');
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const fullName = typeof body.fullName === 'string' ? sanitizeText(body.fullName, 200) || null : undefined;
    const avatarUrl = typeof body.avatarUrl === 'string' ? sanitizeText(body.avatarUrl, 2000) || null : undefined;

    const updates: { full_name?: string | null; avatar_url?: string | null; updated_at?: string } = {};
    if (fullName !== undefined) updates.full_name = fullName;
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
    }
    updates.updated_at = new Date().toISOString();

    const admin = createAdminClient();
    const { error } = await admin.from('profiles').upsert(
      { id: user.id, ...updates },
      { onConflict: 'id' }
    );

    if (error) return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err, 'profile/PUT');
  }
}
