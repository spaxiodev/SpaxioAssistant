# AI Setup Assistant – Implementation Summary

## Overview

The **AI Setup Assistant** is a new dashboard section that lets subscribed users describe what they want in natural language; the AI configures chatbot, lead capture, webhook, and email notification for them. Nothing is changed in production until the user clicks **Publish / Activate**.

## Files Created

### Database

- `supabase/migrations/20260325000000_ai_setup_assistant.sql` – Tables: `ai_setup_sessions`, `ai_setup_messages`, `assistant_blueprints`, `generated_automations`, `widget_deployments`, `setup_publish_logs`, `automation_templates`; RLS policies.
- `supabase/migrations/20260325000001_ai_setup_seed_templates.sql` – Seed rows for `automation_templates`.

### Backend (lib + API)

- `src/lib/ai-setup/types.ts` – Planner config type (`AssistantPlannerConfig`, `CaptureField`, etc.).
- `src/lib/ai-setup/templates.ts` – Supported templates (lead_capture, quote_request_capture, email_notification, webhook_workflow, etc.) and recommendations by business type.
- `src/lib/ai-setup/validation.ts` – Validate and sanitize planner config.
- `src/lib/ai-setup/planner.ts` – Merge AI-extracted JSON into planner config; apply template defaults.
- `src/lib/ai-setup/parse-json-block.ts` – Extract JSON block from AI reply for config updates.
- `src/lib/ai-setup/prompt.ts` – System prompt for AI Setup chat and starter prompts.
- `src/app/api/ai-setup/guard.ts` – Require auth + active subscription for all AI Setup APIs.
- `src/app/api/ai-setup/sessions/route.ts` – GET list, POST create session.
- `src/app/api/ai-setup/sessions/[id]/route.ts` – GET session with messages.
- `src/app/api/ai-setup/sessions/[id]/chat/route.ts` – POST user message; AI reply; update planner config.
- `src/app/api/ai-setup/publish/route.ts` – POST publish: create agent, link widget, update business_settings, create automations (email + webhook), blueprint, generated_automations, widget_deployments, setup_publish_logs.
- `src/app/api/ai-setup/templates/route.ts` – GET list of templates (and recommended by business_type).

### Frontend

- `src/app/[locale]/dashboard/ai-setup/page.tsx` – Dashboard page that renders the client.
- `src/app/dashboard/ai-setup/ai-setup-client.tsx` – Main UI: chat, summary panel, publish button, progress indicator, test mode, generated outputs (embed code, webhook URL/secret, activity log), copy buttons, “New session” / “Regenerate / Edit setup”.

### Navigation & i18n

- `src/components/ui/sidebar-with-submenu.tsx` – New nav item “AI Setup Assistant” (Workspace) with Sparkles icon.
- `messages/en.json` – New keys under `dashboard`: `aiSetupAssistant`, `aiSetupDescription`, `aiSetupChatPlaceholder`, `aiSetupSummary`, `aiSetupGoal`, `aiSetupLeadFields`, `aiSetupAutomations`, `aiSetupNotification`, `aiSetupWidgetStatus`, `aiSetupWebhookStatus`, `aiSetupPublish`, `aiSetupPublishing`, `aiSetupTestMode`, `aiSetupGeneratedOutputs`, `aiSetupEmbedCode`, `aiSetupWebhookUrl`, `aiSetupWebhookSecret`, `aiSetupWhatCreated`, `aiSetupCopyCode`, `aiSetupCopied`, `aiSetupRegenerateEdit`, starter prompts, progress, activity log, subscribe required, upgrade.
- `messages/fr.json` – Same keys in French.

## Files Modified

- `src/components/ui/sidebar-with-submenu.tsx` – Added `Sparkles` icon import and `aiSetupAssistant` link to Workspace nav.
- `messages/en.json` – Added AI Setup translation block.
- `messages/fr.json` – Added AI Setup translation block.

## Environment Variables

No new env vars are required. Existing ones used:

- `OPENAI_API_KEY` – Used by `/api/ai-setup/sessions/[id]/chat` for AI replies (same as widget chat).
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL` – Used when published automations send email (same as existing lead notification).
- `NEXT_PUBLIC_APP_URL` (optional) – For webhook URL and embed code base URL when not inferrable from request.

## Migration Instructions

1. Run Supabase migrations in order:
   - `20260325000000_ai_setup_assistant.sql`
   - `20260325000001_ai_setup_seed_templates.sql`
2. If using Supabase CLI: `npx supabase db push` or apply the SQL in the Supabase SQL Editor.
3. Regenerate types if needed: `npm run db:generate` (or your project’s command).

## How to Test the Full AI Setup Flow Locally

1. **Auth & subscription**
   - Log in as a user in an organization that has an active subscription (or use admin bypass for the org).
   - If the org has no subscription, the AI Setup page shows “Subscribe to use” and the APIs return 403.

2. **Open AI Setup Assistant**
   - Go to `/dashboard/ai-setup` (or `/en/dashboard/ai-setup`).
   - You should see the chat area and the right-hand summary panel.

3. **Start a session**
   - Click “Start new setup” (or a new session is auto-created if none exist).
   - Confirm a session is created (e.g. “Chat” header and input visible).

4. **Chat**
   - Send a message, e.g.: “I want an AI agent to capture leads from my website and email me each time.”
   - Wait for the AI reply; the summary panel should update (goal, capture fields, notification, etc.) from the planner config.

5. **Publish**
   - When the summary looks correct, click “Publish / Activate”.
   - Progress steps should appear; then the “Generated outputs” card with embed code, webhook URL/secret (if enabled), and activity log.
   - Use “Copy code” to copy the embed snippet.

6. **Verify in the rest of the app**
   - **Agents**: New agent should appear.
   - **Install**: Widget embed code should match the one shown in AI Setup.
   - **Automations**: New “AI Setup: Lead notification” and/or “AI Setup: Webhook” automations if configured.
   - **Settings / Business**: Chatbot name, welcome message, lead notification email updated.

7. **Test mode**
   - Expand “Test mode” and confirm the summary of welcome message and fields matches what you configured.

## Placeholder / Mock Logic to Replace Later

- **AI model**: Chat uses `getChatCompletion('openai', 'gpt-4o-mini', ...)`. You can switch model or provider in `src/app/api/ai-setup/sessions/[id]/chat/route.ts`.
- **Config extraction**: Config updates are taken from a single `\`\`\`json ... \`\`\`` block in the AI reply. For more robustness you could use a structured output / tool call to return only JSON.
- **Webhook secret storage**: `widget_deployments.webhook_secret_encrypted` stores the secret in plain text. For production, encrypt it and decrypt only when displaying or validating webhooks.
- **Rate limits**: In-memory rate limits (`rateLimit()`) are per process; for production use Redis or your Supabase/edge rate limiting.

## Security Summary

- All AI Setup API routes use `requireAiSetupAccess()`: valid session + org + **active subscription** (or admin bypass).
- Sessions, messages, blueprints, and generated resources are scoped by `organization_id`.
- Planner config is validated with `validatePlannerConfig()`; only allowed template keys and field types are accepted.
- Webhook tokens and secrets are generated with `generateWebhookToken()` / `generateWebhookSecret()` (crypto).
- No production resources are created until the user clicks Publish; chat only updates draft planner config.

## Optional Next Steps

- **Edit published setup**: Allow “Edit setup” to open a new session pre-filled from the blueprint config and optionally update the same agent/automations.
- **GET outputs by session**: Add `GET /api/ai-setup/sessions/[id]/outputs` that returns embed_code, webhook_url, webhook_secret from `widget_deployments` for the session’s blueprint so users can see them again without re-publishing.
- **Test webhook button**: Add a “Test webhook” button that sends a sample POST to the webhook URL and shows success/failure.
