/**
 * Website auto-setup pipeline: scan → analyze → business settings → knowledge → agents → automations → widget.
 * Updates website_auto_setup_runs status and result_summary; all org-scoped.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchWebsiteText, isValidSetupUrl } from './fetch-and-extract';
import { analyzeWebsiteWithAI } from './analyze-website';
import type { WebsiteAnalysis, SetupRunResultSummary } from './types';
import { ingestDocument } from '@/lib/knowledge/ingest';
import { TRIGGER_TYPES, ACTION_TYPES } from '@/lib/automations/types';
import { sanitizeText } from '@/lib/validation';

const SETUP_RUN_STATUSES = [
  'pending',
  'scanning',
  'building_knowledge',
  'creating_agents',
  'creating_automations',
  'configuring_widget',
  'done',
  'failed',
] as const;

type RunStatus = (typeof SETUP_RUN_STATUSES)[number];

async function updateRun(
  supabase: SupabaseClient,
  runId: string,
  updates: { status?: RunStatus; current_step?: string | null; error_message?: string | null; result_summary?: Record<string, unknown>; completed_at?: string | null }
) {
  await supabase
    .from('website_auto_setup_runs')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', runId);
}

export async function executeWebsiteAutoSetupRun(runId: string): Promise<SetupRunResultSummary> {
  const supabase = createAdminClient();

  const { data: run, error: runError } = await supabase
    .from('website_auto_setup_runs')
    .select('id, organization_id, website_url, business_type, business_description, status')
    .eq('id', runId)
    .single();

  if (runError || !run) {
    throw new Error(runError?.message ?? 'Run not found');
  }
  if (run.status !== 'pending') {
    return (run as { result_summary?: SetupRunResultSummary }).result_summary ?? {};
  }

  const orgId = run.organization_id;
  const url = run.website_url?.trim();
  if (!url || !isValidSetupUrl(url)) {
    await updateRun(supabase, runId, { status: 'failed', error_message: 'Invalid website URL' });
    return {};
  }

  const stepsCompleted: string[] = [];
  const result: SetupRunResultSummary = { steps_completed: stepsCompleted };

  try {
    // 1. Scanning
    await updateRun(supabase, runId, { status: 'scanning', current_step: 'Fetching website...' });
    const websiteText = await fetchWebsiteText(url);
    const safeContent = sanitizeText(websiteText, 40_000);

    // 2. Analyze with AI
    await updateRun(supabase, runId, { current_step: 'Analyzing content...' });
    const analysis = await analyzeWebsiteWithAI(
      safeContent,
      run.business_type ?? undefined,
      run.business_description ?? undefined
    );

    // 3. Update business_settings
    await updateRun(supabase, runId, { status: 'building_knowledge', current_step: 'Updating business profile...' });
    const { data: existingSettings } = await supabase
      .from('business_settings')
      .select('id')
      .eq('organization_id', orgId)
      .single();

    const settingsUpdate: Record<string, unknown> = {
      website_url: url,
      website_learned_content: safeContent,
      website_learned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      business_name: analysis.business_name ?? undefined,
      company_description: analysis.company_description ?? undefined,
      services_offered: analysis.services_offered ?? undefined,
      tone_of_voice: analysis.tone_of_voice ?? undefined,
      contact_email: analysis.contact_email ?? undefined,
      phone: analysis.phone ?? undefined,
      faq: analysis.faq ? (analysis.faq as unknown) : undefined,
    };
    if (existingSettings?.id) {
      await supabase.from('business_settings').update(settingsUpdate).eq('organization_id', orgId);
    } else {
      await supabase.from('business_settings').insert({
        organization_id: orgId,
        ...settingsUpdate,
      });
    }
    result.business_name = analysis.business_name ?? undefined;
    stepsCompleted.push('business_settings');

    // 4. Knowledge source + ingest
    const { data: existingSource } = await supabase
      .from('knowledge_sources')
      .select('id')
      .eq('organization_id', orgId)
      .eq('source_type', 'website_crawl')
      .limit(1)
      .maybeSingle();

    let sourceId = existingSource?.id;
    if (!sourceId) {
      const { data: newSource, error: srcErr } = await supabase
        .from('knowledge_sources')
        .insert({
          organization_id: orgId,
          name: `Website: ${new URL(url).hostname}`,
          source_type: 'website_crawl',
          config: { url },
        })
        .select('id')
        .single();
      if (!srcErr && newSource?.id) {
        sourceId = newSource.id;
      }
    }
    if (sourceId) {
      await updateRun(supabase, runId, { current_step: 'Building knowledge base...' });
      try {
        await ingestDocument(supabase, {
          sourceId,
          title: analysis.business_name ? `${analysis.business_name} – Website` : 'Website',
          content: safeContent,
          embed: true,
        });
        result.knowledge_source_id = sourceId;
        stepsCompleted.push('knowledge');
      } catch (ingestErr) {
        console.warn('[website-auto-setup] ingest failed', (ingestErr as Error).message);
      }
    }

    // 5. Create default agent
    await updateRun(supabase, runId, { status: 'creating_agents', current_step: 'Creating assistant...' });
    const primaryGoal = analysis.company_description ?? 'Help visitors and answer questions.';
    const welcomeMessage = `Hi! I'm here to help. Ask me about ${analysis.business_name ?? 'our services'} or leave your details for a follow-up.`;
    const systemPrompt = `You are a helpful website assistant for ${analysis.business_name ?? 'this business'}. ${primaryGoal} Be concise and match the tone: ${analysis.tone_of_voice ?? 'professional'}. Collect name, email, and phone when relevant.`;

    const { data: newAgent, error: agentErr } = await supabase
      .from('agents')
      .insert({
        organization_id: orgId,
        name: analysis.business_name ? `${analysis.business_name} Assistant` : 'Website Assistant',
        description: primaryGoal.slice(0, 500),
        role_type: 'website_chatbot',
        system_prompt: systemPrompt,
        model_provider: 'openai',
        model_id: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        temperature: 0.7,
        enabled_tools: [],
        widget_enabled: true,
        webhook_enabled: false,
        created_by_ai_setup: true,
      })
      .select('id')
      .single();

    const agentIds: string[] = [];
    if (!agentErr && newAgent?.id) {
      agentIds.push(newAgent.id);
      result.agent_ids = agentIds;

      const { data: existingWidget } = await supabase
        .from('widgets')
        .select('id')
        .eq('organization_id', orgId)
        .limit(1)
        .maybeSingle();

      if (existingWidget?.id) {
        await supabase.from('widgets').update({ agent_id: newAgent.id }).eq('id', existingWidget.id);
      } else {
        await supabase.from('widgets').insert({
          organization_id: orgId,
          name: 'Chat',
          agent_id: newAgent.id,
        });
      }
    }
    stepsCompleted.push('agents');

    // 6. Create default automations
    await updateRun(supabase, runId, { status: 'creating_automations', current_step: 'Creating automations...' });
    const automationIds: string[] = [];
    const { data: settings } = await supabase
      .from('business_settings')
      .select('lead_notification_email, contact_email')
      .eq('organization_id', orgId)
      .single();
    const toEmail = settings?.lead_notification_email ?? settings?.contact_email ?? analysis.contact_email;

    if (toEmail && TRIGGER_TYPES.includes('lead_form_submitted') && ACTION_TYPES.includes('send_email_notification')) {
      const { data: leadAuto } = await supabase
        .from('automations')
        .insert({
          organization_id: orgId,
          name: 'New lead → Email notification',
          description: 'When someone submits the lead form, send an email (created by Website Auto-Setup)',
          status: 'active',
          trigger_type: 'lead_form_submitted',
          trigger_config: {},
          action_type: 'send_email_notification',
          action_config: { to_email: toEmail },
          agent_id: null,
          template_key: 'lead_notification',
        })
        .select('id')
        .single();
      if (leadAuto?.id) automationIds.push(leadAuto.id);
    }

    if (toEmail && TRIGGER_TYPES.includes('quote_request_submitted') && ACTION_TYPES.includes('send_email_notification')) {
      const { data: quoteAuto } = await supabase
        .from('automations')
        .insert({
          organization_id: orgId,
          name: 'Quote request → Email notification',
          description: 'When a quote is requested, notify the team (created by Website Auto-Setup)',
          status: 'active',
          trigger_type: 'quote_request_submitted',
          trigger_config: {},
          action_type: 'send_email_notification',
          action_config: { to_email: toEmail },
          agent_id: null,
          template_key: 'quote_notification',
        })
        .select('id')
        .single();
      if (quoteAuto?.id) automationIds.push(quoteAuto.id);
    }

    if (TRIGGER_TYPES.includes('support_requested') && ACTION_TYPES.includes('create_support_ticket')) {
      const { data: supportAuto } = await supabase
        .from('automations')
        .insert({
          organization_id: orgId,
          name: 'Support request → Create ticket',
          description: 'When a visitor requests support, create a ticket (created by Website Auto-Setup)',
          status: 'active',
          trigger_type: 'support_requested',
          trigger_config: {},
          action_type: 'create_support_ticket',
          action_config: {},
          agent_id: null,
        })
        .select('id')
        .single();
      if (supportAuto?.id) automationIds.push(supportAuto.id);
    }

    result.automation_ids = automationIds;
    stepsCompleted.push('automations');

    // 7. Configure widget
    await updateRun(supabase, runId, { status: 'configuring_widget', current_step: 'Configuring widget...' });
    await supabase
      .from('business_settings')
      .update({
        chatbot_welcome_message: welcomeMessage,
        chatbot_name: analysis.business_name ? `${analysis.business_name} Assistant` : 'Assistant',
        widget_enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', orgId);
    result.widget_updated = true;
    stepsCompleted.push('widget');

    await updateRun(supabase, runId, {
      status: 'done',
      current_step: null,
      error_message: null,
      result_summary: result as unknown as Record<string, unknown>,
      completed_at: new Date().toISOString(),
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Setup failed';
    console.error('[website-auto-setup] pipeline error', err);
    await updateRun(supabase, runId, {
      status: 'failed',
      error_message: message.slice(0, 1000),
      completed_at: new Date().toISOString(),
    });
    throw err;
  }
}
