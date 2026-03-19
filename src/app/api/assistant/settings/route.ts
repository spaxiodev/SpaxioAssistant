import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { sanitizeText } from '@/lib/validation';
import { handleApiError } from '@/lib/api-error';

const DISPLAY_MODES = ['widget', 'full_page', 'both'] as const;
type DisplayMode = (typeof DISPLAY_MODES)[number];

function isValidDisplayMode(v: unknown): v is DisplayMode {
  return typeof v === 'string' && (DISPLAY_MODES as readonly string[]).includes(v);
}

/** GET /api/assistant/settings – assistant-specific settings for the AI assistant page. */
export async function GET() {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('business_settings')
      .select('chatbot_welcome_message, assistant_display_mode')
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      return NextResponse.json({
        welcomeMessage: 'Hi! How can I help you today?',
        assistantDisplayMode: 'widget',
      });
    }

    const row = data as Record<string, unknown>;
    return NextResponse.json({
      welcomeMessage: row.chatbot_welcome_message ?? 'Hi! How can I help you today?',
      assistantDisplayMode: isValidDisplayMode(row.assistant_display_mode)
        ? row.assistant_display_mode
        : 'widget',
    });
  } catch (err) {
    return handleApiError(err, 'assistant/settings/GET');
  }
}

/** PUT /api/assistant/settings – partial update: welcome message and display mode only. */
export async function PUT(request: Request) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) return NextResponse.json({ error: 'No organization' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const updatePayload: Record<string, unknown> = {};

    if (typeof body.welcomeMessage === 'string') {
      updatePayload.chatbot_welcome_message = sanitizeText(body.welcomeMessage, 500) || null;
    }
    if (isValidDisplayMode(body.assistantDisplayMode)) {
      updatePayload.assistant_display_mode = body.assistantDisplayMode;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('business_settings')
      .update(updatePayload)
      .eq('organization_id', organizationId);

    if (error) {
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err, 'assistant/settings/PUT');
  }
}
