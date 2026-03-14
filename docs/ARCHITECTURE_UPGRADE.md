# SpaxioAssistant → AI Infrastructure Platform: Architecture Audit & Upgrade Plan

## A. Current Architecture Summary

### Stack
- **Frontend**: Next.js 16 (App Router), React 18, Tailwind CSS, Radix UI, next-intl (en/fr), Lucide icons
- **Backend**: Next.js API routes (serverless), Supabase (Postgres + Auth), no separate API server
- **Auth**: Supabase Auth; `getOrganizationId()` returns first org from `organization_members`; `ensureUserOrganization()` creates org + default business_settings + **one widget** + trialing subscription on first login
- **Billing**: Stripe (checkout, portal, webhook); subscription per organization; trial_ends_at, status (trialing | active | past_due | canceled | incomplete)
- **AI**: OpenAI only; `OPENAI_API_KEY`, `OPENAI_MODEL` (default gpt-4o-mini); used in `/api/widget/chat` and `/api/help-chat`; no model abstraction, no tool calling
- **Email**: Resend for contact form and lead notifications

### Folder structure (relevant)
```
src/
  app/
    [locale]/          # Localized pages (dashboard, login, signup, widget, …)
    api/               # API routes: billing, contact, settings, widget (chat, config, lead, quote), ensure-org, help-chat
    widget.js/         # Embed script route + embed.in.js
  components/          # UI (card, button, …), dashboard (header, sidebar), help-chat, etc.
  lib/                 # assistant/prompt, auth-server, ensure-org, supabase (client, server, admin), validation, rate-limit, admin, app-url
  i18n/
supabase/migrations/  # SQL migrations (initial_schema, widget position/logo/chatbot_name, website_learn, RLS fixes)
```

### Database schema (current)
- **profiles** – id (→ auth.users), full_name, avatar_url
- **organizations** – id, name, slug
- **organization_members** – organization_id, user_id, role (owner | admin | member)
- **business_settings** – one per org: business_name, industry, company_description, services_offered, pricing_notes, faq (JSONB), tone_of_voice, contact_email, phone, lead_notification_email, primary_brand_color, chatbot_name, chatbot_welcome_message, widget_*, website_url, **website_learned_content**, website_learned_at, last_learn_attempt_at, faq_page_url, service_base_prices
- **widgets** – id, organization_id, name (one widget per org in practice; created in ensure-org)
- **subscriptions** – organization_id, stripe_*, status, trial_ends_at, current_period_end
- **conversations** – widget_id, visitor_id, metadata
- **messages** – conversation_id, role (user | assistant | system), content
- **leads** – organization_id, conversation_id, name, email, phone, …
- **quote_requests** – organization_id, conversation_id, customer_name, service_type, …

### How chatbot training works
- **Learn website**: `POST /api/settings/learn-website` with optional `url` (else uses business_settings.website_url). Fetches HTML, strips scripts/styles/tags, truncates to 12k chars, stores in `business_settings.website_learned_content`. Cooldown 10 min. No chunking, no embeddings, no vector store.

### How widget embed works
- Customer embeds: `<script src="https://yourdomain.com/widget.js" data-widget-id="WIDGET_UUID"></script>` (script reads `data-widget-id`; install page shows first widget id).
- Script: loads `/api/widget/config?widgetId=…` (CORS); if enabled, mounts bubble + iframe. Iframe src: `/{locale}/widget?widgetId=…&lang=…`.
- Chat: widget iframe POSTs to `/api/widget/chat` with `{ widgetId, conversationId?, message, language? }`. API resolves widget → org → business_settings, builds system prompt from business_settings + website_learned_content, appends last 30 messages, calls OpenAI, stores user + assistant message, extracts quote/lead into quote_requests/leads.

### Conversations/messages
- Stored in `conversations` (widget_id) and `messages` (conversation_id, role, content). No agent_id; no tool_calls. History for chat is last 30 messages by conversation.

### Environment variables
- **Required**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **OpenAI**: `OPENAI_API_KEY`, `OPENAI_MODEL` (optional, default gpt-4o-mini)
- **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`
- **App**: `NEXT_PUBLIC_APP_URL` (production)
- **Optional**: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ADMIN_USER_IDS` (comma-separated, bypass subscription)

### Deployment
- Next.js build/start; Supabase hosted; env vars in hosting (e.g. Vercel). No Docker/custom server referenced.

### Billing/subscription logic
- Checkout creates/uses Stripe customer, creates session; webhook updates `subscriptions` (status, trial_ends_at, current_period_end). Widget chat and install page check subscription (active or trialing with trial_ends_at in future) or `isOrgAllowedByAdmin()`.

---

## B. Upgrade Plan

1. **Organizations/workspaces** – Already present (organizations + organization_members). No change; “workspace” = organization.
2. **Agents system** – Add `agents` table; link widgets to agents; migrate existing behavior to “website_chatbot” agent; keep backward compat when widget has no agent (resolve from org default agent or business_settings).
3. **Knowledge infrastructure** – Add `knowledge_sources`, `knowledge_documents`, `knowledge_chunks`, `document_embeddings`; ingestion pipeline (website crawl → document → chunks → embeddings); migrate `website_learned_content` into first knowledge source/document; keep using it in prompt until RAG is wired.
4. **Tool calling** – Add tools registry and execution layer; optional tool_calls on messages; extend chat flow to support tools (search_knowledge_base, send_email, etc.).
5. **Workflow automation** – Webhook triggers, event logs, outbound webhooks; n8n-ready placeholders.
6. **Memory** – Short-term = existing conversation context; long-term = optional workspace/agent memory table and summarization later.
7. **Model routing** – Abstract provider (OpenAI, Anthropic, OpenRouter); per-agent model selection.
8. **Dashboard** – New routes: /dashboard/agents, /dashboard/knowledge, /dashboard/automations, /dashboard/analytics, /dashboard/integrations; keep existing pages and sidebar, add nav items.
9. **Widget** – Support `data-agent-id` in addition to `data-widget-id`; resolve widget from agent when needed; keep existing embed working.
10. **Analytics** – Tables/counters for conversations, messages, tool calls, leads, token usage (foundation); dashboard overview.

---

## C. Risk List

- **Breaking embeds**: Existing embeds use `data-widget-id`. We keep widget_id in config/chat; add optional data-agent-id; no breaking change.
- **Chat behavior change**: Switching to agent-based prompt/model must match or improve current behavior for existing chatbots (website_chatbot type + same system prompt source until knowledge RAG is on).
- **DB migrations**: Add tables and nullable FKs; backfill agents from widgets; avoid long locks.
- **RLS**: New tables (agents, knowledge_*) need RLS aligned with organization_members.
- **Env**: New env vars (e.g. OpenRouter, Anthropic) optional; existing OPENAI_* remains.

---

## D. Step-by-Step Implementation Order

1. **DB migrations** – agents table; widget.agent_id (nullable); knowledge_sources, knowledge_documents, knowledge_chunks, document_embeddings; RLS; backfill script (widget → agent website_chatbot).
2. **Model routing** – lib/ai/provider abstraction; OpenAI implementation; agent.model_provider / model_id.
3. **Agents API** – GET/POST /api/agents, GET/PATCH /api/agents/[id]; use in chat when agent_id present.
4. **Chat backward compat** – Resolve “effective” agent from widget.agent_id or org default; build prompt from agent or fallback to business_settings.
5. **Knowledge API** – Upload, list, ingest (website → document → chunks); embeddings placeholder (or OpenAI embeddings); search_knowledge_base tool stub.
6. **Tools framework** – Registry, run endpoint, search_knowledge_base, send_email, etc.; wire into chat when agent has tools enabled.
7. **Dashboard** – Sidebar links; /dashboard/agents (list, create, edit); /dashboard/knowledge (sources, upload); /dashboard/automations (placeholder); /dashboard/analytics (overview); /dashboard/integrations (placeholder).
8. **Widget** – Accept data-agent-id; resolve widget from agent for iframe/chat if needed; keep data-widget-id primary for existing installs.
9. **Analytics** – Counts in dashboard overview; optional usage table later.
10. **Copy/UX** – “Create AI workers” messaging where appropriate; keep onboarding and branding.

---

## Migration Strategy (DB)

- **chatbot → agents**: Add `agents` table. For each existing widget, insert one agent (type = `website_chatbot`, name from business_settings.chatbot_name or widget name), set `widgets.agent_id`. Conversations stay on widget_id; chat route uses agent for prompt/model when widget.agent_id is set.
- **Website training → knowledge**: Add knowledge_sources/documents/chunks/embeddings. Backfill: for each org with website_learned_content, create one source (type website_crawl), one document, one chunk (or few) with the text; optionally embed later. Keep writing website_learned_content from learn-website until UI uses knowledge API.
- **Rollback**: New tables can be dropped; widget.agent_id set to null; chat route falls back to current logic. No drop of existing columns in first phase.

---

## API Route Patterns (align with existing style)

- `GET/POST /api/agents` – list/create (org-scoped)
- `GET/PATCH /api/agents/[id]` – get/update
- `POST /api/agents/[id]/chat` – optional future (currently keep POST /api/widget/chat with widgetId)
- `POST /api/knowledge/upload` – file/text upload
- `GET /api/knowledge/sources` – list sources
- `POST /api/tools/run` – execute tool (internal/server-side)
- `POST /api/webhooks/incoming/[agentId]` – incoming webhook placeholder
- `GET /api/analytics/overview` – counts for dashboard

Existing: `/api/widget/chat`, `/api/widget/config`, `/api/settings/learn-website`, etc. remain; extended internally to use agents/knowledge where applicable.

---

## Testing checklist

- [ ] Run DB migrations in order: `20260314000000_agents_and_widget_agent_id.sql`, `20260314000001_knowledge_tables.sql`, `20260314000002_backfill_agents_from_widgets.sql`.
- [ ] Regenerate Supabase types if needed: `npm run db:generate`.
- [ ] Existing embed: script with `data-widget-id` only — chat, config, iframe work unchanged.
- [ ] New embed: script with `data-agent-id` only — by-agent resolves widget, then same as above.
- [ ] Dashboard: /dashboard/agents lists backfilled agents; /dashboard/knowledge, /automations, /analytics, /integrations load.
- [ ] Chat uses agent when widget has agent_id: prompt from agent if system_prompt set, else from business_settings; model/temperature from agent.
- [ ] Subscription/trial check still applies to widget chat.
- [ ] No new env vars required; OPENAI_* and rest unchanged.

---

## Deployment / update checklist

1. **Database**: Apply migrations in a maintenance window or with minimal lock. Run backfill after schema migrations.
2. **App**: Deploy as usual. Backward compat: widgets without agent_id still work (chat uses business_settings + default model).
3. **Widget**: Existing installs keep `data-widget-id`; new installs can use `data-agent-id` or `data-widget-id`.
4. **Rollback**: To revert, set `widgets.agent_id = null` and keep using existing chat logic; new tables can stay or be dropped later.
