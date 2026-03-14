# SpaxioAssistant – Automations Architecture Audit

**Date:** 2025-03-14  
**Purpose:** In-place upgrade to event-driven AI automation platform (not greenfield).

---

## A. Current Architecture Summary

### 1. Frontend

| Area | Stack / Location |
|------|------------------|
| **Framework** | Next.js 16 (App Router), React 18, next-intl |
| **App structure** | `src/app/[locale]/` — locale in path; dashboard under `[locale]/dashboard/` |
| **UI system** | Tailwind, Radix (Dialog, Dropdown, Select, etc.), shadcn-style components in `src/components/ui/` |
| **Dashboard layout** | `src/app/[locale]/dashboard/layout.tsx` — wraps with Sidebar; sidebar from `src/components/dashboard/sidebar.tsx` → `SidebarWithSubmenu` |
| **Automations route** | **Page:** `src/app/[locale]/dashboard/automations/page.tsx` (server: fetches automations, agents, runs). **Client:** `src/app/dashboard/automations/` — `automations-dashboard-client.tsx`, `automations-list.tsx`, `create-automation-modal.tsx`, `recent-runs.tsx` |
| **Agent/chatbot UI** | Dashboard: Agents list/edit under `dashboard/agents/`; widget chat is embed script + `/api/widget/chat` |
| **Widget UI** | Public widget: `src/app/widget.js/embed.in.js`; config from `/api/widget/config`; lead submit to `/api/widget/lead` |

**Reusable UI:** Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Input, Label, Dialog, DropdownMenu, useToast. All automations components use these.

### 2. Backend

| Area | Details |
|------|--------|
| **API style** | REST (Next.js Route Handlers in `src/app/api/`). No server actions for automations. |
| **Route organization** | `api/automations` (GET, POST), `api/automations/[id]` (GET, PATCH, DELETE), `api/automations/[id]/test` (POST), `api/automations/[id]/toggle` (POST), `api/automations/runs` (GET). |
| **Services** | No dedicated “services” folder. Logic in `src/lib/automations/runner.ts` (runAutomation, executeAction) and inline in API routes. |
| **Queue/background** | None. Runs execute synchronously in request. |
| **Webhooks** | Outbound: `call_webhook` action in runner POSTs to `action_config.url`. Inbound: **no inbound webhook route** for triggering automations. |

**Convention:** Auth via `getOrganizationId()` from `@/lib/auth-server`; DB via `createAdminClient()` from `@/lib/supabase/admin`; errors via `handleApiError` from `@/lib/api-error`.

### 3. Database

| Area | Details |
|------|--------|
| **Tenancy** | Organization-based. `organization_id` on automations, widgets, agents, business_settings, leads, conversations. RLS uses `get_user_organization_ids(auth.uid())` and `get_user_owner_admin_organization_ids(auth.uid())`. |
| **Chatbot/agent** | `agents` (organization_id, name, system_prompt, model_provider, model_id, temperature, enabled_tools, etc.). `widgets` (organization_id, agent_id nullable). |
| **Conversations/messages** | `conversations` (widget_id, visitor_id, metadata), `messages` (conversation_id, role, content). |
| **Automations** | `automations`: id, organization_id, name, description, status (draft|active|paused), **trigger_type** (single), **trigger_config** (JSONB), **action_type** (single), **action_config** (JSONB), agent_id, template_key, created_at, updated_at. **automation_runs**: id, automation_id, status (queued|running|success|failed), input_payload, output_payload, error_message, started_at, completed_at. **No** automation_steps, automation_run_steps, automation_events, workspace_id on runs, event_id, trace_id, duration_ms. |
| **Billing** | subscriptions (organization_id, plan_id, stripe_*), plans, plan_entitlements, org_usage (message_count, ai_action_count per period). |
| **Event/log tables** | None for automations. No event store. |

### 4. AI

| Area | Details |
|------|--------|
| **Agent/chat** | Widget chat: `src/app/api/widget/chat/route.ts` — loads widget → agent (optional) → business_settings, builds system prompt via `buildSystemPromptForAgent` / `buildSystemPrompt` from `@/lib/assistant/prompt`, then `getChatCompletion` or `runChatWithToolsLoop`. |
| **Model provider** | `@/lib/ai/provider.ts`: OpenAI only (`getChatCompletion`). Agent has model_provider + model_id. |
| **RAG / vector** | `@/lib/knowledge/search.ts` — `searchKnowledge()` uses `getEmbedding()` and Supabase RPC `match_knowledge_chunks`. Knowledge tables: knowledge_sources, knowledge_documents, knowledge_chunks (with embedding). |
| **Tool calling** | `@/lib/ai/chat-with-tools.ts` — `runChatWithToolsLoop`, `buildOpenAIToolsSchema`. Tools from `@/lib/tools/registry.ts` (search_knowledge_base, send_email, generate_lead_summary, etc.). ToolContext: organizationId, supabase, conversationId, agentId, widgetId. |
| **Prompts** | `@/lib/assistant/prompt.ts` — buildSystemPrompt(settings), buildSystemPromptForAgent(agent, settings). |
| **Ingestion** | Knowledge: ingest-url, upload, ingest API + `@/lib/knowledge/ingest.ts`, chunking, embeddings. No “website ingestion” in automations. |

### 5. Deployment / infra

| Area | Details |
|------|--------|
| **Env vars** | OPENAI_API_KEY, OPENAI_MODEL, RESEND_API_KEY, RESEND_FROM_EMAIL, Supabase URL/keys, Stripe (billing), STRIPE_PRICE_ID*, etc. |
| **Hosting** | Next.js; assumed Vercel or similar (serverless). No cron/scheduling in codebase. |
| **External** | Stripe (checkout, webhook), Resend (email), Supabase (DB + Auth + optional Edge Functions). |

---

## B. Reusable Components and Services

- **Auth:** `getOrganizationId()`, `getUser()`, `isAuthenticated()`.
- **DB:** `createAdminClient()`, `createClient()` (server).
- **Entitlements:** `canUseAutomation()`, `getEntitlements()`, `getPlanForOrg()`, `getCurrentUsage()`, `isOrgAllowedByAdmin()`.
- **Automations:** `runAutomation()`, `executeAction()` in `runner.ts`; `TRIGGER_TYPES`, `ACTION_TYPES`, `AUTOMATION_TEMPLATES`, `getTemplateByKey()`.
- **Validation:** `sanitizeText()`, `isUuid()`, `normalizeUuid()` in `@/lib/validation`.
- **UI:** All dashboard automations components; Card, Button, Badge, Dialog, Dropdown, Input, Label, useToast.
- **i18n:** `dashboard.automations`, `dashboard.automationsHero`, `dashboard.createAutomation`, etc. in `messages/en.json` and `messages/fr.json`.

---

## C. Constraints and Risks

1. **No event-driven triggers today**  
   Widget chat and widget lead **do not** call `runAutomation()` or emit events. Only **manual test** from the dashboard runs automations. Templates reference `contact_info_captured`, `lead_form_submitted`, `conversation_completed` but nothing fires them.

2. **Single trigger / single action**  
   Current schema is one trigger_type and one action_type per automation. No steps table, no multi-step runs. Extending to steps and run_steps requires migrations and backward compatibility (e.g. keep current rows working by treating “single action” as one step).

3. **Runner bug**  
   In `runner.ts`, `call_webhook` uses `_input` (undefined) instead of `input` when building the fetch body.

4. **No workspace_id on runs**  
   automation_runs only has automation_id; for analytics and scoping, adding organization_id (or workspace_id) is useful.

5. **No inbound webhook**  
   No route for external systems to trigger automations; no webhook secrets table.

6. **Agent execution from automations**  
   `qualify_lead_with_agent` is a placeholder; no shared “run agent for workflow” service used by runner.

7. **Billing**  
   `canUseAutomation()` gates create and test; no per-run or per-automation-count limits yet.

---

## D. Exact Upgrade Strategy

1. **Preserve**  
   Keep existing automations and automation_runs tables and API contracts. Do not remove trigger_type/action_type; extend with steps and event envelope where needed.

2. **Add, don’t replace**  
   New: event types and envelope, event dispatcher, optional automation_steps (with backward compat: if no steps, use legacy action_type). New: automation_run_steps, optional automation_events table, workspace_id on runs, event_id, trace_id, duration_ms.

3. **Wire triggers**  
   After event layer exists: from widget/lead (lead_form_submitted, contact_info_captured), from widget/chat (conversation_completed, new_chat_started, etc.), from new form ingestion endpoint, from inbound webhook route, and keep manual test.

4. **Central runner**  
   Single “receive event → find matching automations → run” path; runner creates run, executes steps (or legacy single action), writes run_steps and run result.

5. **Templates and UX**  
   Expand templates (e.g. 12), refine copy to “AI workflows” and “triggers”; add run detail view, filters, and basic analytics later.

---

## E. Ordered Implementation Plan

| Step | What |
|------|------|
| 1 | **Audit** (this doc) + fix runner `call_webhook` bug (`_input` → `input`). |
| 2 | **Product reframe** — Copy in dashboard/marketing: “AI workflows”, “Triggers”, “Runs”; keep existing keys where possible. |
| 3 | **Event engine** — Event type constants, event envelope type, `emitAutomationEvent()` that finds active automations by trigger_event_type, validates conditions (optional), calls runner. |
| 4 | **Migrations** — Add workspace_id to automation_runs; add event_id, trigger_event_type, trace_id, duration_ms, summary; optional automation_events; add automation_steps and automation_run_steps with backward compat (no steps ⇒ use legacy action_type). |
| 5 | **Event ingestion** — From widget/lead: emit lead_form_submitted + contact_info_captured; from widget/chat: new_chat_started, conversation_completed (or similar) where appropriate; form ingestion endpoint; inbound webhook route with workspace secret. |
| 6 | **Templates + UX** — Expand template set; premium header and empty states; run detail page and filters. |
| 7 | **Create/edit** — Keep modal; add step list when steps model is live; agent selector and webhook URL already present. |
| 8 | **Agent + knowledge** — Reusable “run agent for workflow” (classification, summarization, lead score) and use in runner; optional knowledge context. |
| 9 | **Runs/debug + analytics** — Run detail view, step-level logs, basic metrics (total runs, success/fail, by automation). |
| 10 | **Polish** — Loading/empty/error states, extension-point comments, testing/rollout checklist. |

---

## Exact File Reference

### Current automations (to extend, not replace)

- `src/app/[locale]/dashboard/automations/page.tsx`
- `src/app/dashboard/automations/automations-dashboard-client.tsx`
- `src/app/dashboard/automations/automations-list.tsx`
- `src/app/dashboard/automations/create-automation-modal.tsx`
- `src/app/dashboard/automations/recent-runs.tsx`
- `src/lib/automations/runner.ts`
- `src/lib/automations/templates.ts`
- `src/lib/automations/types.ts`
- `src/app/api/automations/route.ts`
- `src/app/api/automations/[id]/route.ts`
- `src/app/api/automations/[id]/test/route.ts`
- `src/app/api/automations/[id]/toggle/route.ts`
- `src/app/api/automations/runs/route.ts`
- `supabase/migrations/20260317000000_automations_tables.sql` (existing; new migrations add columns/tables)

### First high-leverage changes

1. **Fix:** `src/lib/automations/runner.ts` — use `input` in call_webhook.
2. **Add:** Event types and envelope in `src/lib/automations/types.ts` (or new `events.ts`).
3. **Add:** `src/lib/automations/engine.ts` — `emitAutomationEvent(orgId, event, supabase)` → match automations → run.
4. **Call engine from:** `src/app/api/widget/lead/route.ts` (after lead insert), and later from widget/chat and new form/webhook routes.
5. **Migrations:** New file(s) for workspace_id on runs, event_id, trigger_event_type, trace_id, duration_ms, summary; then automation_steps and automation_run_steps if we add multi-step in same pass.

This audit is the single source of truth for the in-place upgrade; implementation follows the order above and reuses all listed components and services.

---

## Implementation Summary (Phases 1–4)

### Done

1. **Audit** — This document; runner `call_webhook` bug fixed (`_input` → `input`).
2. **Product reframe** — Copy updated in `messages/en.json` and `messages/fr.json`: automationsHero, automationsDescription; added `triggers`, `runs` keys.
3. **Event-driven engine** — `src/lib/automations/types.ts`: `EVENT_TYPES`, `AutomationEventEnvelope`. `src/lib/automations/engine.ts`: `emitAutomationEvent()` finds active automations by `trigger_type`, runs them via `runAutomation()`. `src/lib/automations/runner.ts`: optional `eventEnvelope`; writes `organization_id`, `trigger_event_type`, `trace_id`, `correlation_id`, `duration_ms`, `summary` on runs.
4. **Migrations** — `20260318000000_automation_runs_event_fields.sql`: run columns. `20260318000001_webhook_secret.sql`: `business_settings.webhook_secret`.
5. **Widget lead trigger** — `src/app/api/widget/lead/route.ts`: after lead insert, emits `lead_form_submitted` via `emitAutomationEvent()` (fire-and-forget), gated by `canUseAutomation`.
6. **Inbound webhook** — `src/app/api/automations/events/route.ts`: POST with `X-Webhook-Secret` or `Authorization: Bearer <secret>`, body `{ event_type, payload }`; looks up org by `business_settings.webhook_secret`, then `emitAutomationEvent()`.
7. **Templates** — 12 templates in `src/lib/automations/templates.ts` (added quote request intake, low confidence rescue, daily lead digest, webhook to CRM sync, post-conversation summary, smart sales routing).
8. **Trigger labels** — New trigger types labeled in `automations-list.tsx` and `create-automation-modal.tsx`.

### Regenerate DB types

After applying migrations, run: `npm run db:generate` so `automation_runs` Row/Insert/Update include the new columns.
