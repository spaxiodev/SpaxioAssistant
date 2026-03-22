import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const orgId = await getOrganizationId();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get('channel') ?? 'sms';
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('communication_conversations')
    .select('id,channel_type,external_contact_identifier,status,language,ai_enabled,last_message_at,lead_id')
    .eq('organization_id', orgId)
    .eq('channel_type', channel)
    .order('last_message_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversations: data ?? [] });
}
