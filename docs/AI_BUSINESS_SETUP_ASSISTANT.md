# AI Business Setup Assistant

## Summary

The **AI Business Setup Assistant** expands the existing AI setup system so that a business owner can provide business information (website URL, uploaded files, pasted text, chat, pricing, FAQs, service descriptions) and receive a **draft** full-business setup. The user reviews, edits, and approves sections before any live config is changed. Publishing applies only approved sections to existing tables (business_settings, knowledge, pricing, agents, automations, widget, AI pages).

---

## 1. Files Created / Changed

### New files

- **supabase/migrations/20260405000000_business_setup_drafts.sql** – Table `business_setup_drafts` with status, source_inputs, extracted_* jsonb columns, assumptions, missing_items, confidence_scores, section_approvals, RLS.
- **src/lib/business-setup/types.ts** – Types for drafts, source inputs, extracted sections, section approvals, confidence, publish results.
- **src/lib/business-setup/ai-business-extraction-service.ts** – Server-side AI extraction from combined text (profile, services, knowledge, pricing, agents, automations, widget, ai_pages, branding).
- **src/lib/business-setup/ai-business-review-service.ts** – Computes confidence_scores, assumptions, missing_items per section.
- **src/lib/business-setup/ai-business-setup-service.ts** – Orchestration: build combined text (with optional website fetch), run extraction, review, persist draft.
- **src/lib/business-setup/apply-business-setup-service.ts** – Applies approved sections to live tables (business_settings, knowledge_sources/documents, quote_pricing_*, agents, automations, widget, ai_pages).
- **src/app/api/business-setup/drafts/route.ts** – GET list drafts, POST create draft.
- **src/app/api/business-setup/drafts/[id]/route.ts** – GET one draft, PATCH update draft (source_inputs, section_approvals, or extracted overrides).
- **src/app/api/business-setup/drafts/[id]/extract/route.ts** – POST run extraction (uses draft or body source_inputs).
- **src/app/api/business-setup/drafts/[id]/publish/route.ts** – POST publish selected sections (body `sections` or uses section_approvals).
- **src/app/[locale]/dashboard/business-setup/page.tsx** – Server page; loads recent drafts, renders client.
- **src/app/dashboard/business-setup/business-setup-page-client.tsx** – Chooses Simple vs Developer view.
- **src/app/dashboard/business-setup/business-setup-developer-view.tsx** – Developer view: create draft, extract, raw JSON, section toggles, publish.
- **src/components/dashboard/simple-pages/simple-business-setup-page.tsx** – Simple Mode wizard: input collection → extract → review cards → publish.
- **docs/AI_BUSINESS_SETUP_ASSISTANT.md** – This document.

### Modified files

- **src/components/dashboard/simple-mode-router.tsx** – Route `/dashboard/business-setup` → `SimpleBusinessSetupPage`.
- **src/components/ui/sidebar-with-submenu.tsx** – Nav item “Business Setup” → `/dashboard/business-setup`.
- **messages/en.json**, **messages/fr.json** – Added `businessSetup` key.
- **src/components/dashboard/simple-pages/simple-ai-setup-page.tsx** – “Full business setup” card with link to `/dashboard/business-setup`.

---

## 2. Migrations Required

Run:

```bash
supabase db push
```

Or run in Supabase SQL Editor:

- **supabase/migrations/20260405000000_business_setup_drafts.sql**

This creates `business_setup_drafts` with RLS (org owners/admins only). No changes to existing tables.

---

## 3. How the Draft Business Setup Is Stored

- **Table:** `business_setup_drafts`
- **Key columns:**
  - `organization_id` – tenant scope
  - `status` – `draft` | `extracting` | `ready` | `partially_published` | `published` | `failed`
  - `source_inputs` (jsonb) – website_url, pasted_text, chat_summary, pricing_text, faq_text, uploaded_file_summaries, etc.
  - `extracted_*` (jsonb) – extracted_business_profile, extracted_services, extracted_knowledge, extracted_pricing, extracted_agents, extracted_automations, extracted_widget_config, extracted_ai_pages, extracted_branding
  - `assumptions`, `missing_items` (jsonb arrays), `confidence_scores` (jsonb object per section)
  - `section_approvals` (jsonb) – per-section `approved` | `rejected` | `edited`
  - `current_step`, `error_message` for progress/errors

Drafts are never applied to live config until the user runs **Publish** and approves sections.

---

## 4. How Users Review and Publish Generated Setup

### Simple Mode

1. Go to **Business Setup** (sidebar) or **Set up my whole business** from AI Setup.
2. **Tell us about your business:** website URL, describe your business, paste content, optional pricing/FAQ.
3. Click **Let AI build your setup** → creates draft and runs extraction (with optional website fetch).
4. **Review what we found:** section cards (Business Info, Services, Knowledge, Pricing, Agents, Automations, Widget, AI Pages, Branding) with assumptions and missing items; include/exclude per section; widget welcome message and agent previews where relevant.
5. Click **Approve and go live (N sections)** → only approved sections are applied.
6. **Setup applied** → link to Settings.

### Developer Mode

1. **Business Setup** page: create draft (website URL, description, pasted content), then **Create draft and extract**.
2. Select a draft from the list; view **Extracted sections** and raw JSON.
3. Toggle sections to include in publish; click **Publish N section(s)**.

### API

- **Publish:** `POST /api/business-setup/drafts/[id]/publish` with body `{ "sections": ["business_profile", "services", ...] }` or omit to use `section_approvals` (approved/edited).
- Only sections that are approved (or explicitly listed) are applied; no silent overwrite.

---

## 5. Which Existing Systems Are Populated by the AI Setup

When the user publishes, the apply service writes only for **approved sections**:

| Section            | Target tables / behavior                                                                 |
|--------------------|-------------------------------------------------------------------------------------------|
| business_profile   | `business_settings` (business_name, company_description, industry, contact, tone, welcome_message, lead_notification_email) |
| services           | `business_settings.services_offered` (merge with existing)                                |
| knowledge          | New `knowledge_sources` + `knowledge_documents` (FAQs, business facts, summary) via ingest |
| pricing            | `quote_pricing_profiles`, `quote_services`, `quote_pricing_rules` (create/update by slug)  |
| agents             | `agents` (with created_by_ai_setup); first agent linked to existing widget               |
| automations        | `automations` (trigger/action types validated; email uses lead_notification_email)        |
| widget_config      | `business_settings` (chatbot_welcome_message, primary_brand_color)                       |
| ai_pages           | `ai_pages` (suggested quote/support/general pages; created unpublished)                   |
| branding           | `business_settings` (tone_of_voice, chatbot_welcome_message)                            |

All writes are org-scoped and RLS-safe. Apply logic avoids duplicate agents/automations/ai_pages where practical (e.g. by slug).

---

## 6. How Pricing Fits Into the Larger Setup Flow

- Pricing is **one section** of the draft. The AI extracts pricing when the user provides pricing text or website content that implies pricing (variables, rules, services with base_price).
- If no pricing info is provided, `extracted_pricing` can be null or minimal; the review service marks “Pricing rules or notes” as missing and sets a lower confidence.
- The user can **approve only business_profile and services** and leave pricing for later, or approve pricing and have the apply service create/update `quote_pricing_profiles`, `quote_services`, and `quote_pricing_rules`.
- Pricing is not required to complete the flow; the wizard and publish API support partial publish.

---

## 7. How to Test End-to-End

1. **Apply migration** (see §2).
2. **Simple Mode**
   - Log in as an org owner with an active subscription.
   - Go to **Business Setup** (or AI Setup → **Set up my whole business**).
   - Enter a website URL and/or “We are a landscaping company in Montreal. We do lawn mowing, bush trimming, seasonal cleanup. We charge by lot size; bush trimming per bush.”
   - Click **Let AI build your setup**; wait for extraction to finish.
   - On review, check Business Info, Services, Pricing, Agents, Widget; leave some sections unapproved.
   - Click **Approve and go live**; confirm only approved sections appear in Settings, Agents, Automations, Pricing.
3. **Developer Mode**
   - Switch to Developer Mode; open **Business Setup**.
   - Create draft and extract; open a draft; inspect raw JSON; toggle sections; publish and confirm DB updates.
4. **API**
   - `POST /api/business-setup/drafts` with `source_inputs`, then `POST .../drafts/[id]/extract`, then `GET .../drafts/[id]`, then `POST .../drafts/[id]/publish` with `sections`.

---

## 8. Assumptions Made

- **Subscription:** Reused `requireAiSetupAccess()` so Business Setup is gated like the existing AI Setup (active subscription or admin).
- **Knowledge base:** Apply creates a knowledge source “AI Business Setup” and one document (FAQs + business facts + summary); it does not create or require a specific `knowledge_bases` row except when creating a new source (then gets or creates a default base).
- **Agents:** Apply creates up to 5 agents from extracted list; first is linked to the org’s first widget. Role types are validated against existing ROLE_TYPES; `created_by_ai_setup` is set.
- **Automations:** Trigger/action types are validated against `TRIGGER_TYPES` and `ACTION_TYPES`; email notifications use `lead_notification_email` or `contact_email` from business_settings when available.
- **Pricing:** Apply uses the first default `quote_pricing_profiles` row for the org if present, otherwise creates one; services are upserted by slug; rules are inserted (no de-duplication by name).
- **Website fetch:** Only when `source_inputs.website_url` is set; same timeout/size limits as existing website-scanner style fetch; errors are returned and draft status set to failed.
- **No file upload in API:** “Uploaded files” is represented as `uploaded_file_summaries` in `source_inputs`; actual file upload and summarization can be added later (e.g. reuse knowledge upload + summarization).
- **Single draft per run:** Creating a draft and running extract creates one draft; user can create multiple drafts over time and select which to publish.
- **Partial publish:** User can publish a subset of sections; draft status becomes `partially_published` or `published` depending on how many sections were applied.
