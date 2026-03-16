# Four Features Implementation Summary

This document summarizes the implementation of the four major features added to Spaxio Assistant: AI Website Scanner & Auto-Setup, AI Lead Qualification & Deal Scoring, AI Workflow Generator, and AI Website Actions.

---

## 1. Summary of Files Created / Changed

### Feature 1: AI Website Scanner & Auto-Setup

**Created:**
- `supabase/migrations/20260330000000_website_auto_setup_runs.sql` – Table for setup run status and progress.
- `src/lib/website-auto-setup/types.ts` – Run status and result types.
- `src/lib/website-auto-setup/fetch-and-extract.ts` – Fetch URL and strip HTML to text.
- `src/lib/website-auto-setup/analyze-website.ts` – AI extraction of business name, services, FAQs, contact, tone.
- `src/lib/website-auto-setup/run-pipeline.ts` – Orchestration: scan → analyze → business_settings → knowledge → agents → automations → widget.
- `src/app/api/website-auto-setup/start/route.ts` – POST start a run (async).
- `src/app/api/website-auto-setup/status/[runId]/route.ts` – GET run status and result.

**Changed:**
- `src/components/dashboard/ai-website-setup-card.tsx` – Uses new `/api/website-auto-setup/start` and polls `/api/website-auto-setup/status/[runId]` for progress and success summary.

### Feature 2: AI Lead Qualification & Deal Scoring

**Created:**
- `supabase/migrations/20260330000001_leads_qualification.sql` – New columns on `leads`: `qualification_score`, `qualification_priority`, `qualification_summary`, `qualification_raw`, `qualified_at`, `recommended_deal_stage`, `estimated_deal_value`, `next_recommended_action`.
- `src/lib/lead-qualification/types.ts` – `LeadQualificationResult` type.
- `src/lib/lead-qualification/qualify-lead.ts` – Server-side AI qualification (score, priority, summary, recommended stage, etc.).
- `src/lib/lead-qualification/qualify.ts` – Public API: `qualifyLeadWithAi`, `updateLeadWithQualification`.

**Changed:**
- `src/app/api/widget/lead/route.ts` – After inserting a lead, calls `qualifyLeadWithAi` and `updateLeadWithQualification` (fire-and-forget).
- `src/app/[locale]/dashboard/leads/page.tsx` – Uses `qualification_score`, `qualification_priority`, `qualification_summary`, `next_recommended_action`; shows score/priority badges and “AI Summary” section.
- `src/lib/supabase/database.types.ts` – Leads row type updated with new qualification columns.
- `src/app/api/widget/chat/route.ts` – Emits `quote_request_submitted` when a quote request is created (for automations).

### Feature 3: AI Workflow Generator

**Existing (unchanged):**
- `src/lib/automations/ai-workflow-generator.ts` – Maps natural language to automation draft (trigger + steps).
- `src/app/api/automations/generate/route.ts` – POST body `{ instruction }`, returns `{ draft }`.
- `src/app/dashboard/automations/automations-dashboard-client.tsx` – “Generate with AI” card, preview, save as automation + steps.
- Simple Mode: `src/components/dashboard/simple-pages/simple-automations-page.tsx` – “Tell AI what should happen” → AI setup / Developer Mode.

No new files; feature was already implemented and is used as-is.

### Feature 4: AI Website Actions

**Created:**
- `supabase/migrations/20260330000002_widget_action_mappings.sql` – `business_settings.widget_action_mappings` (JSONB).
- `src/lib/widget-actions/types.ts` – Allowlisted action types, `WidgetChatAction`, `sanitizeActionUrl`, `sanitizeSectionId`, `parseAndSanitizeAction`.
- `src/lib/widget-actions/parse-action-from-reply.ts` – Parses optional `ACTION: type` line from AI reply and strips it.

**Changed:**
- `src/app/api/widget/chat/route.ts` – System instruction for optional `ACTION: <type>` in reply; `parseActionFromReply` to get `cleanReply` and `action`; store `replyToStore`; optional second LLM call for action if not in reply; response includes `reply` and optional `action: { type, payload }`.
- `src/app/api/widget/config/route.ts` – Already returns `actionMappings` from `widget_action_mappings` (verified).
- `src/app/[locale]/widget/page.tsx` – Already posts `spaxio-action` to parent when `data.action` is present (verified).
- `src/app/widget.js/embed.in.js` – `dispatchWebsiteAction` already present; added support for `payload.section_id`, correct scroll selector handling, and `CustomEvent('spaxio-website-action')` for form/open actions when no mapping.

---

## 2. Required Migrations

Run in order:

1. **`20260330000000_website_auto_setup_runs.sql`**  
   Creates `website_auto_setup_runs` (id, organization_id, status, current_step, website_url, business_type, business_description, result_summary, error_message, started_at, completed_at, created_at, updated_at). RLS for org owners/admins.

2. **`20260330000001_leads_qualification.sql`**  
   Adds to `leads`: `qualification_score`, `qualification_priority`, `qualification_summary`, `qualification_raw`, `qualified_at`, `recommended_deal_stage`, `estimated_deal_value`, `next_recommended_action`. All nullable, backwards compatible.

3. **`20260330000002_widget_action_mappings.sql`**  
   Adds to `business_settings`: `widget_action_mappings` (JSONB, default `{}`).

Apply with:

```bash
npx supabase db push
# or
npx supabase migration up
```

Then regenerate TypeScript types:

```bash
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

---

## 3. New Environment Variables

No new environment variables are required. Existing ones are used as follows:

- **OPENAI_API_KEY** – Used by website auto-setup (analyze), lead qualification, workflow generator, widget chat (including action inference), and quote/lead extraction.
- **OPENAI_MODEL** – Optional; defaults to `gpt-4o-mini` where applicable.
- **RESEND_API_KEY** / **RESEND_FROM_EMAIL** – Already used for lead notifications and automation emails (unchanged).

---

## 4. How to Test Each Feature Manually

### 1. AI Website Scanner & Auto-Setup

1. Log in as an org owner, open the dashboard (Simple Mode or Developer Mode).
2. Go to **Setup with AI** (or **AI Setup** in the sidebar) so the “Do it for me: set up from my website” card is visible.
3. Enter a valid public website URL (e.g. `https://example.com`), optionally business type and description.
4. Click **Start setup**. The card should show progress (Scanning…, Building knowledge…, Creating assistant…, etc.).
5. Polling runs every 2s; when status is `done`, a success block appears with what was created (business settings, knowledge, assistants, automations, widget).
6. In Developer Mode, verify: **Business settings** (name, description, etc.), **Knowledge** (new source + documents), **Agents** (new agent), **Automations** (e.g. lead/quote notifications), **Widget** (welcome message).

**API (optional):**

- `POST /api/website-auto-setup/start` with body `{ "website_url": "https://...", "business_type": "...", "business_description": "..." }` → returns `run_id`.
- `GET /api/website-auto-setup/status/<run_id>` → returns `status`, `current_step`, `result_summary`, `error_message`.

### 2. AI Lead Qualification & Deal Scoring

1. Ensure **OPENAI_API_KEY** is set.
2. Submit a lead via the widget lead form (or the lead capture flow that calls `POST /api/widget/lead`) with name, email, and optional message/service/timeline.
3. In the dashboard, open **Leads**. The new lead should show:
   - **Score** badge (0–100) and **Priority** badge (Hot lead / Likely customer soon / Needs follow-up).
   - **AI Summary** and **Next** recommendation when qualification has run.
4. Qualification runs asynchronously; if it’s slow, refresh the lead list/details after a few seconds.

**API:** No direct API for qualification; it runs after `POST /api/widget/lead` and updates the same lead row.

### 3. AI Workflow Generator

1. Go to **Automations** (Developer Mode).
2. In the “Generate with AI” card, enter e.g.:  
   `When someone submits a quote request, create a deal and send me an email.`
3. Click **Generate draft**. A draft should appear with name, trigger (`quote_request_submitted`), action, and optional steps.
4. Click **Create automation**. The new automation appears in the list as draft; edit or activate as needed.
5. In Simple Mode, open **Automations** and use “Ask AI to create an automation” (or similar) to reach the same flow via AI setup / Developer Mode.

### 4. AI Website Actions

1. Embed the widget on a test page that has at least one of: a section with id (e.g. `id="pricing"`), a link you’re okay opening, or a form you can open (e.g. contact/quote).
2. Open the widget and send a message that implies an action, e.g.:
   - “I want a quote” / “Show me the quote form”
   - “Open the pricing section” / “Scroll to pricing”
   - “Open https://example.com”
3. The assistant should reply and the response may include an `action` (e.g. `open_quote_form`, `scroll_to_section`, `open_link`). The widget iframe posts `spaxio-action` to the parent; the embed script runs `dispatchWebsiteAction`:
   - **open_link** with `payload.url`: opens URL in a new tab (if http/https).
   - **scroll_to_section** with `payload.section_id` (e.g. `#pricing`): scrolls to that element.
   - **open_contact_form** / **open_quote_form** / etc.: if `widget_action_mappings` in business settings map that action to a selector/URL, that is used; otherwise a `CustomEvent('spaxio-website-action', { detail: action })` is fired so the host page can handle it.
4. Optional: In **Business settings** (or widget settings), set `widget_action_mappings` (e.g. `{ "open_quote_form": { "selector": "#quote-form" } }`) and confirm the embed uses it (e.g. clicks the element or scrolls to it).

**Response shape:** Chat API returns `{ conversationId, reply [, action: { type, payload } ] }`. If an action cannot be run, the reply is still shown; no silent failure.

---

## Architecture Notes

- **Org tenancy & RLS:** All new tables and APIs are scoped by `organization_id`; RLS uses existing helpers (e.g. `get_user_owner_admin_organization_ids`).
- **Billing:** Website auto-setup and automation generation require an active subscription (existing checks). Lead qualification and website actions use existing message/usage accounting.
- **Simple vs Developer Mode:** Website setup and workflow generation are available in both; Simple Mode uses “Do It For Me” and plain language; Developer Mode exposes generated config and full editing.
- **AI:** All AI calls (website analysis, lead qualification, workflow generation, chat and action inference) run server-side only.
- **Observability:** Pipeline and qualification errors are logged; setup run status and lead qualification fields are stored for debugging and auditing.
