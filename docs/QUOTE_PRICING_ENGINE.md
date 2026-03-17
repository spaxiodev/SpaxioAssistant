# Quote Pricing Engine – Implementation Summary

This document summarizes the AI quote pricing system added to Spaxio Assistant.

---

## 1. Files created / changed

### New files
- **supabase/migrations/20260404000000_quote_pricing_engine.sql** – Creates `quote_pricing_profiles`, `quote_services`, `quote_pricing_variables`, `quote_pricing_rules`, `quote_estimation_runs`; extends `quote_requests` and `ai_pages` with pricing/estimate fields.
- **src/lib/quote-pricing/types.ts** – Shared types (profiles, services, variables, rules, estimation result).
- **src/lib/quote-pricing/quote-pricing-engine.ts** – Server-side engine: validate inputs, apply rules (fixed_price, per_unit, tiered, addon, multiplier, minimum_charge, range_adjustment, formula), return subtotal/total/range and line items. Formula evaluation is a safe expression parser (no `eval`/`Function`).
- **src/lib/quote-pricing/estimate-quote-service.ts** – Loads pricing context, runs engine, persists estimation runs.
- **src/lib/quote-pricing/industry-templates.ts** – Preset templates: web_design, landscaping, cleaning, consulting.
- **src/app/api/dashboard/pricing-profiles/route.ts** – GET list, POST create (optional from template).
- **src/app/api/dashboard/pricing-profiles/[id]/route.ts** – GET full context, PATCH profile.
- **src/app/api/dashboard/pricing-profiles/[id]/preview/route.ts** – POST with `inputs` (and optional `service_id`) to run preview.
- **src/app/[locale]/dashboard/pricing/page.tsx** – Dashboard pricing list page (server).
- **src/app/[locale]/dashboard/pricing/[id]/page.tsx** – Dashboard pricing profile detail + preview (server).
- **src/app/dashboard/pricing/pricing-profiles-list.tsx** – Client: list profiles, create from template or custom.
- **src/app/dashboard/pricing/pricing-profile-detail.tsx** – Client: variables/rules summary + test estimate form.

### Modified files
- **src/lib/ai-pages/types.ts** – `SessionStateEstimate`, `SessionState.estimate`, `SessionState.selected_service_id`; `AiPageRow.pricing_profile_id`.
- **src/app/api/ai-page/chat/route.ts** – For quote pages: loads pricing context, injects variable list into system prompt (“do not invent prices”), after extraction runs pricing engine and stores `estimate` + `selected_service_id` in session state.
- **src/lib/ai-pages/outcome-service.ts** – On quote completion: runs estimate again, persists `quote_estimation_runs`, updates `quote_requests` with `estimation_run_id`, `estimate_total`, `estimate_low`, `estimate_high`, `estimate_line_items`.
- **src/components/ai-page/ai-page-client.tsx** – Side panel shows estimate breakdown (line items, total or range), confidence/review messaging when present.
- **src/lib/document-generation/types.ts** – `quoteRequest` context extended with `customer_email`, `customer_phone`, `estimate_total`, `estimate_low`, `estimate_high`, `estimate_line_items`.
- **src/app/api/documents/generate/route.ts** – Passes new quote request fields (including estimate fields) into document context.
- **src/lib/document-generation/generate-document.ts** – Quote draft prompt instructs to use provided `estimate_line_items` and `estimate_total` when available.
- **src/app/api/dashboard/ai-pages/[id]/route.ts** – PUT accepts `pricing_profile_id`.
- **src/app/[locale]/dashboard/ai-pages/[id]/page.tsx** – Fetches pricing profiles, passes to form and initial `pricing_profile_id`.
- **src/components/ai-page/ai-page-form.tsx** – Pricing profile dropdown for quote page type; sends `pricing_profile_id` on update.
- **src/components/ui/sidebar-with-submenu.tsx** – Added “Pricing rules” to setup submenu.
- **messages/en.json**, **messages/fr.json** – `pricingRules`, `pricingRulesDescription`.
- **src/lib/supabase/database.types.ts** – `quote_requests` Row extended with `customer_email`, `customer_phone`, `estimation_run_id`, `estimate_*`, `estimate_line_items`.

---

## 2. Migrations required

Run (in order):

- **20260404000000_quote_pricing_engine.sql**

This migration:

- Creates `quote_pricing_profiles` (org-scoped, RLS).
- Creates `quote_services` (per profile), `quote_pricing_variables` (per profile/service), `quote_pricing_rules` (per profile/service).
- Creates `quote_estimation_runs` (audit trail; links to quote_request, conversation, ai_page, service).
- Adds to `quote_requests`: `estimation_run_id`, `estimate_total`, `estimate_low`, `estimate_high`, `estimate_line_items`.
- Adds to `ai_pages`: `pricing_profile_id`.

All new tables use existing RLS helpers: `get_user_organization_ids`, `get_user_owner_admin_organization_ids`. Service policies allow insert/update for server-side usage.

---

## 3. How pricing rules are stored

- **quote_pricing_profiles** – One per org (or more): name, industry_type, is_default, currency, pricing_mode (`exact_estimate` | `estimate_range` | `quote_draft_only` | `manual_review_required_above_threshold` | `always_require_review`), config (JSONB).
- **quote_services** – Under a profile: name, slug, description, is_active, base_price, config.
- **quote_pricing_variables** – Under a profile, optionally under a service: key, label, variable_type (number, boolean, select, multi_select, text, area, quantity, currency, range), unit_label, required, default_value, options (JSONB), help_text, sort_order.
- **quote_pricing_rules** – Under a profile, optionally under a service: rule_type (fixed_price, per_unit, tiered, addon, multiplier, minimum_charge, range_adjustment, formula), name, description, config (JSONB), sort_order, is_active. Config shapes are fixed per rule_type (e.g. per_unit: variable_key, price_per_unit; addon: variable_key, when_value, amount).

Industry templates in `industry-templates.ts` define variables and rules; creating a profile “from template” inserts profile + one service + variables + rules.

---

## 4. How the AI uses pricing rules during quote conversations

1. **Quote AI page** – When the page type is `quote` and the page (or org default) has a pricing profile, the chat route loads that profile’s variables and rules.
2. **System prompt** – A block is appended listing “variables to collect” and instructing: do not invent or guess prices; the system will calculate from the user’s answers.
3. **After each reply** – Intake extraction runs as before (OpenAI JSON extraction for intake_schema keys). If the page is quote and a pricing context exists:
   - Service is inferred from `collected_fields.service_slug` / `service_type` or single service in profile.
   - `runEstimate()` is called with collected fields, profile context, and service id.
   - If any rules apply, the result (subtotal, total, line_items, confidence, human_review_recommended, output_mode) is stored in `session_state.estimate` and `session_state.selected_service_id`.
4. **Response** – The JSON response includes updated `session_state`, so the client can show the live estimate in the side panel.
5. **Completion** – On “Submit”, `createOutcomesForRun` creates the quote request, then re-runs the engine with the same collected inputs, persists a `quote_estimation_run`, and updates the quote request with `estimation_run_id` and estimate totals/line items.

So: the AI only collects and clarifies; all numbers come from the server-side engine. If no profile is linked or no rules apply, no estimate is shown and the AI does not fabricate prices.

---

## 5. How businesses configure pricing (Simple vs Developer)

- **Simple** – Dashboard → Install & settings → **Pricing rules**. List profiles; “Create from template” (Web Design, Landscaping, Cleaning, Consulting) or “Create custom”. Each profile has an “Edit & preview” page: view variables and rules, and a “Test estimate” section to enter sample inputs and see the calculated result. No raw JSON; templates give ready-made variables and rules that can be refined later (e.g. via API or future UI).
- **Developer** – Same list and detail pages. Full control is via:
  - **API**: GET/POST `/api/dashboard/pricing-profiles`, GET/PATCH `/api/dashboard/pricing-profiles/[id]`, POST `/api/dashboard/pricing-profiles/[id]/preview`.
  - Direct DB (with RLS): `quote_services`, `quote_pricing_variables`, `quote_pricing_rules` are all manageable by org owners/admins. The detail page currently shows variables and rules read-only; a future “Developer mode” could add inline editing of variables/rules and config JSON.

Linking to a Quote AI page: Dashboard → AI Pages → Edit page → for page type “Quote Assistant”, choose **Pricing rules profile**. Only shown when the org has at least one profile.

---

## 6. How quote drafts and estimate runs are linked

- **quote_requests** – New columns: `estimation_run_id` (FK to `quote_estimation_runs`), `estimate_total`, `estimate_low`, `estimate_high`, `estimate_line_items` (JSONB array of `{ name, label?, amount }`).
- **quote_estimation_runs** – One row per calculation: `quote_request_id`, `conversation_id`, `ai_page_id`, `service_id`, `extracted_inputs`, `applied_rules`, `estimate_subtotal`, `estimate_total`, `estimate_low`, `estimate_high`, `confidence`, `assumptions`, `output_mode`, `human_review_recommended`.
- **Flow** – On AI page “Submit”, the outcome service creates the quote request, then runs the engine, inserts a row into `quote_estimation_runs` with `quote_request_id` and the result, then updates the quote request with `estimation_run_id` and the estimate fields.
- **Documents** – When generating a “Quote draft” from a quote request, the document context includes `estimate_total`, `estimate_low`, `estimate_high`, `estimate_line_items`; the generator is instructed to use these exact numbers in the pricing section. The document is linked to the quote request (and optionally conversation) as before.

So: quote_request → estimation_run (1:1 for that submission); quote_request (and run) hold the numbers; documents can be generated from the quote request and show the same line items/totals.

---

## 7. How to test quote accuracy end-to-end

1. **Apply migration** – Run `20260404000000_quote_pricing_engine.sql`.
2. **Create a pricing profile** – Dashboard → Pricing rules → Create from template (e.g. Web Design). Optionally open the profile and use “Test estimate” with e.g. number_of_pages=6, ecommerce_enabled=true; confirm total matches expectations.
3. **Create/link Quote AI page** – AI Pages → create or edit a page → type “Quote Assistant” → select the new pricing profile → save.
4. **Use the quote page** – Open the public page (e.g. /a/quote). In chat, provide the required variables (e.g. name, email, number of pages, ecommerce yes/no). Confirm the side panel shows an estimate with line items and total.
5. **Submit** – Click “Submit and finish”. In Dashboard → Quote requests, open the new request; it should show estimate_total and estimate_line_items. Optionally generate a “Quote draft” document from that quote request and confirm the document shows the same totals and line items.
6. **Preview API** – `POST /api/dashboard/pricing-profiles/{id}/preview` with `{ "inputs": { "number_of_pages": 5, "ecommerce_enabled": true } }` (auth required); response should include `applied_rules`, `total`, and optionally `estimate_low`/`estimate_high` for range mode.

---

## 8. Assumptions made

- One default pricing profile per org is enough; “default” is used when an AI page has no `pricing_profile_id` set.
- Formula rule type is limited to a safe expression (numbers, variable names, +, -, *, /, parentheses); no functions or arbitrary code.
- Industry templates create one service per template when applicable; variables/rules are attached to that service or profile-level.
- Quote request creation still uses the existing `createQuoteRequestFromSession` (name, email, phone, service_type, project_details, etc.); estimate fields are added in a follow-up update after the estimation run is inserted.
- The AI page chat does not call an external “run estimate” API; it calls `getPricingContext` and `runEstimate` in process. Preview in the dashboard uses the dedicated preview API.
- RLS “Service can insert/update quote_estimation_runs” is kept broad so server-side code can write runs; reads remain org-scoped for members.
- Output modes (exact_estimate, estimate_range, etc.) are stored and returned; the current UI shows range when `estimate_low`/`estimate_high` are present and a single total otherwise. Business-facing toggles for “what the customer sees” (exact vs range vs “we’ll confirm”) can be added later via profile config or outcome_config.
