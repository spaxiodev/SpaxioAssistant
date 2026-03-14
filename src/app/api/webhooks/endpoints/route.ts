import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationId } from '@/lib/auth-server';
import { randomBytes } from 'crypto';

/** GET: list webhook endpoints for the org */
export async function GET() {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('webhook_endpoints')
    .select('id, name, slug, active, last_success_at, last_failure_at, last_failure_message, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ endpoints: data ?? [] });
}

/** POST: create webhook endpoint (name, slug); secret is auto-generated */
export async function POST(request: Request) {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 255) : '';
  const slug = typeof body.slug === 'string'
    ? body.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-').slice(0, 64)
    : '';

  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const finalSlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '-').slice(0, 64) || 'webhook';
  const secret = randomBytes(32).toString('hex');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('webhook_endpoints')
    .insert({
      organization_id: orgId,
      name,
      slug: finalSlug,
      secret,
      active: true,
    })
    .select('id, name, slug, active, secret, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'An endpoint with this slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ endpoint: data });
}
