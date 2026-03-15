import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { requireAiSetupAccess } from '@/app/api/ai-setup/guard';
import { rateLimit } from '@/lib/rate-limit';
import { handleApiError } from '@/lib/api-error';
import { sanitizeText } from '@/lib/validation';
import { getPublicAppUrl } from '@/lib/app-url';
import {
  generateWebhookToken,
  generateWebhookSecret,
  buildAutomationWebhookUrl,
} from '@/lib/automations/webhook-url';
import { validatePlannerConfig } from '@/lib/ai-setup/validation';
import type { AssistantPlannerConfig } from '@/lib/ai-setup/types';
import { TRIGGER_TYPES, ACTION_TYPES } from '@/lib/automations/types';
import { canCreateAgent, canUseAutomation, canCreateAutomation, getEntitlements } from '@/lib/entitlements';
import { isOrgAllowedByAdmin } from '@/lib/admin';

/** POST /api/ai-setup/publish – publish session: create agent, widget link, automations, blueprint, deployment */
export async function POST(request: Request) {
  try {
    const access = await requireAiSetupAccess();
    if ('response' in access) return access.response;
    const { orgId, supabase } = access;

    const rl = rateLimit({ key: `ai-setup-publish:${orgId}`, limit: 5, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many publish attempts', code: 'rate_limit' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : null;
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }

    const { data: session, error: sessionError } = await supabase
      .from('ai_setup_sessions')
      .select('id, organization_id, status, planner_config')
      .eq('id', sessionId)
      .eq('organization_id', orgId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (session.status === 'published') {
      return NextResponse.json({ error: 'Session is already published' }, { status: 400 });
    }

    const plannerConfig = (session.planner_config ?? {}) as AssistantPlannerConfig;
    const validation = validatePlannerConfig(plannerConfig);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid configuration', errors: validation.errors },
        { status: 400 }
      );
    }

    const adminAllowed = await isOrgAllowedByAdmin(supabase, orgId);
    const canCreateAgentResult = await canCreateAgent(supabase, orgId, adminAllowed);
    if (!canCreateAgentResult) {
      return NextResponse.json(
        { error: 'Agent limit reached. Upgrade to create more agents.', code: 'plan_limit' },
        { status: 403 }
      );
    }
    const canUseAutomationResult = await canUseAutomation(supabase, orgId, adminAllowed);
    const canCreateAutomationResult = await canCreateAutomation(supabase, orgId, adminAllowed);

    const chatbotName = sanitizeText(plannerConfig.chatbot_name, 200) || 'Assistant';
    const primaryGoal = sanitizeText(plannerConfig.primary_goal, 2000) || 'Help visitors and capture leads.';
    const welcomeMessage =
      sanitizeText(plannerConfig.widget_config?.welcomeMessage, 500) ||
      'Hi! How can I help you today?';
    const { entitlements } = await getEntitlements(supabase, orgId);
    const canSetLogo = adminAllowed || entitlements.custom_branding;
    const rawWidgetLogoUrl =
      typeof plannerConfig.widget_config?.widgetLogoUrl === 'string' &&
      plannerConfig.widget_config.widgetLogoUrl.trim().length > 0
        ? plannerConfig.widget_config.widgetLogoUrl.trim().slice(0, 2000)
        : null;
    const widgetLogoUrl = canSetLogo ? rawWidgetLogoUrl : null;
    const notificationEmail =
      typeof plannerConfig.notification_email === 'string' && plannerConfig.notification_email.trim()
        ? plannerConfig.notification_email.trim().slice(0, 320)
        : null;
    const webhookEnabled = plannerConfig.webhook_enabled === true;

    const logs: { action: string; details: Record<string, unknown> }[] = [];
    let agentId: string | null = null;
    let widgetId: string | null = null;
    const automationIds: string[] = [];
    let webhookUrl: string | null = null;
    let webhookSecret: string | null = null;

    const systemPrompt = `You are a helpful website assistant for this business. Goal: ${primaryGoal}. Be concise and professional. Collect visitor information when relevant (name, email, phone) and help with questions.`;

    const { data: newAgent, error: agentError } = await supabase
      .from('agents')
      .insert({
        organization_id: orgId,
        name: chatbotName,
        description: primaryGoal.slice(0, 500),
        role_type: 'website_chatbot',
        system_prompt: systemPrompt,
        model_provider: 'openai',
        model_id: 'gpt-4o-mini',
        temperature: 0.7,
        enabled_tools: [],
        widget_enabled: true,
        webhook_enabled: webhookEnabled,
        created_by_ai_setup: true,
      })
      .select('id')
      .single();

    if (agentError || !newAgent?.id) {
      console.error('[API] ai-setup publish create agent', agentError);
      return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
    }
    agentId = newAgent.id;
    logs.push({ action: 'agent_created', details: { agent_id: agentId, name: chatbotName } });

    const { data: existingWidget } = await supabase
      .from('widgets')
      .select('id')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingWidget?.id) {
      widgetId = existingWidget.id;
      await supabase.from('widgets').update({ agent_id: agentId }).eq('id', widgetId);
      logs.push({ action: 'widget_linked', details: { widget_id: widgetId, agent_id: agentId } });
    } else {
      const { data: newWidget, error: widgetError } = await supabase
        .from('widgets')
        .insert({
          organization_id: orgId,
          name: 'Chat',
          agent_id: agentId,
        })
        .select('id')
        .single();
      if (widgetError || !newWidget?.id) {
        console.error('[API] ai-setup publish create widget', widgetError);
      } else {
        widgetId = newWidget.id;
        logs.push({ action: 'widget_created', details: { widget_id: widgetId } });
      }
    }

    await supabase
      .from('business_settings')
      .update({
        chatbot_name: chatbotName,
        chatbot_welcome_message: welcomeMessage,
        lead_notification_email: notificationEmail ?? undefined,
        widget_enabled: plannerConfig.widget_enabled !== false,
        ...(widgetLogoUrl !== null ? { widget_logo_url: widgetLogoUrl } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', orgId);

    if (
      notificationEmail &&
      canUseAutomationResult &&
      canCreateAutomationResult &&
      TRIGGER_TYPES.includes('lead_form_submitted') &&
      ACTION_TYPES.includes('send_email_notification')
    ) {
      const { data: emailAutomation, error: emailAutoError } = await supabase
        .from('automations')
        .insert({
          organization_id: orgId,
          name: 'AI Setup: Lead notification',
          description: 'Send email when a lead is captured (created by AI Setup Assistant)',
          status: 'active',
          trigger_type: 'lead_form_submitted',
          trigger_config: {},
          action_type: 'send_email_notification',
          action_config: { to_email: notificationEmail },
          agent_id: null,
          template_key: 'new_website_lead_notification',
        })
        .select('id')
        .single();
      if (!emailAutoError && emailAutomation?.id) {
        automationIds.push(emailAutomation.id);
        logs.push({ action: 'automation_created', details: { automation_id: emailAutomation.id, type: 'email_notification' } });
      }
    }

    if (webhookEnabled && canUseAutomationResult && canCreateAutomationResult) {
      const token = generateWebhookToken();
      const secret = generateWebhookSecret();
      const headersList = await headers();
      const baseUrl = getPublicAppUrl({ headers: headersList });
      webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/webhooks/${token}`;
      webhookSecret = secret;

      const { data: webhookAutomation, error: webhookAutoError } = await supabase
        .from('automations')
        .insert({
          organization_id: orgId,
          name: 'AI Setup: Webhook',
          description: 'Forward lead/events to external URL (created by AI Setup Assistant)',
          status: 'active',
          trigger_type: 'webhook_received',
          trigger_config: {},
          action_type: 'call_webhook',
          action_config: {},
          webhook_token: token,
          webhook_secret: secret,
          agent_id: null,
          template_key: 'webhook_to_crm_sync',
        })
        .select('id')
        .single();
      if (!webhookAutoError && webhookAutomation?.id) {
        automationIds.push(webhookAutomation.id);
        logs.push({ action: 'automation_created', details: { automation_id: webhookAutomation.id, type: 'webhook' } });
      }
    }

    const { data: blueprint, error: blueprintError } = await supabase
      .from('assistant_blueprints')
      .insert({
        organization_id: orgId,
        ai_setup_session_id: sessionId,
        name: plannerConfig.chatbot_name || 'My setup',
        config: plannerConfig,
      })
      .select('id')
      .single();

    if (blueprintError || !blueprint?.id) {
      console.error('[API] ai-setup publish blueprint', blueprintError);
      return NextResponse.json({ error: 'Failed to create blueprint' }, { status: 500 });
    }

    await supabase.from('generated_automations').insert(
      [
        { organization_id: orgId, assistant_blueprint_id: blueprint.id, resource_type: 'agent', resource_id: agentId },
        ...(widgetId ? [{ organization_id: orgId, assistant_blueprint_id: blueprint.id, resource_type: 'widget_link', resource_id: widgetId }] : []),
        ...automationIds.map((aid) => ({
          organization_id: orgId,
          assistant_blueprint_id: blueprint.id,
          resource_type: 'automation' as const,
          resource_id: aid,
        })),
      ].filter(Boolean) as Array<{ organization_id: string; assistant_blueprint_id: string; resource_type: 'agent' | 'automation' | 'widget_link'; resource_id: string }>
    );

    const headersList = await headers();
    const baseUrl = getPublicAppUrl({ headers: headersList }).replace(/\/$/, '');
    const embedCode =
      widgetId ?
        `<script src="${baseUrl}/widget.js" data-widget-id="${widgetId}"></script>`
      : '';

    if (widgetId) {
      await supabase.from('widget_deployments').insert({
        organization_id: orgId,
        assistant_blueprint_id: blueprint.id,
        widget_id: widgetId,
        agent_id: agentId,
        embed_code: embedCode,
        webhook_url: webhookUrl,
        webhook_secret_encrypted: webhookSecret,
        created_at: new Date().toISOString(),
      });
    }

    for (const log of logs) {
      await supabase.from('setup_publish_logs').insert({
        organization_id: orgId,
        ai_setup_session_id: sessionId,
        action: log.action,
        details: log.details,
      });
    }

    await supabase
      .from('ai_setup_sessions')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('organization_id', orgId);

    return NextResponse.json({
      success: true,
      blueprint_id: blueprint.id,
      agent_id: agentId,
      widget_id: widgetId,
      automation_ids: automationIds,
      embed_code: embedCode,
      webhook_url: webhookUrl,
      webhook_secret: webhookSecret,
      logs,
    });
  } catch (err) {
    return handleApiError(err, 'ai-setup/publish/POST');
  }
}
