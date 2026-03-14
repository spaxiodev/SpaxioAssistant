import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationId } from '@/lib/auth-server';
import { isUuid, normalizeUuid } from '@/lib/validation';
import { buildSystemPromptForAgent } from '@/lib/assistant/prompt';
import { getChatCompletion } from '@/lib/ai/provider';
import type { BusinessSettingsContext } from '@/lib/assistant/prompt';

type Params = { params: Promise<{ id: string }> };

/** POST: run agent with a test message (no conversation). Returns { reply }. */
export async function POST(request: Request, { params }: Params) {
  const organizationId = await getOrganizationId();
  if (!organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const agentId = normalizeUuid(id);
  if (!isUuid(agentId)) {
    return NextResponse.json({ error: 'Invalid agent id' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 4000) : '';
  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, system_prompt, model_provider, model_id, temperature, role_type')
    .eq('id', agentId)
    .eq('organization_id', organizationId)
    .single();

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const { data: settings } = await supabase
    .from('business_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  const systemContent = buildSystemPromptForAgent(
    agent,
    settings as BusinessSettingsContext | null
  );

  try {
    const result = await getChatCompletion(
      agent.model_provider ?? 'openai',
      agent.model_id ?? 'gpt-4o-mini',
      [
        { role: 'system', content: systemContent },
        { role: 'user', content: message },
      ],
      {
        max_tokens: 500,
        temperature: agent.temperature ?? 0.7,
      }
    );
    return NextResponse.json({ reply: result.content });
  } catch (err) {
    console.error('[API] agents test', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get reply' },
      { status: 500 }
    );
  }
}
