# AI Features Implementation Summary

This document summarizes the implementation of three advanced AI business features: **AI Follow-Up Engine**, **AI Memory Across Conversations**, and **AI Document/Quote Generator**.

---

## 1. Summary of Files Created / Changed

### New files

**Migrations**
- `supabase/migrations/20260331000000_ai_follow_up_memory_docs.sql` – `ai_follow_up_runs`, `ai_memories`, documents columns (`quote_request_id`, `metadata`, `updated_at`)

**Follow-up**
- `src/lib/follow-up/types.ts`
- `src/lib/follow-up/generate-follow-up.ts`
- `src/lib/follow-up/trigger-follow-up.ts`
- `src/app/api/follow-up/route.ts` (GET by leadId / quoteRequestId / sourceType+sourceId)
- `src/app/api/follow-up/apply/route.ts` (POST create task / add note)
- `src/components/dashboard/follow-up-card.tsx`

**AI Memory**
- `src/lib/ai-memory/types.ts`
- `src/lib/ai-memory/extract-memory.ts`
- `src/lib/ai-memory/retrieve-memory.ts`
- `src/app/api/memories/route.ts` (GET list by subject)
- `src/app/api/memories/[id]/route.ts` (DELETE archive)
- `src/components/dashboard/memory-card.tsx`

**Document generation**
- `src/lib/document-generation/types.ts`
- `src/lib/document-generation/generate-document.ts`
- `src/app/api/documents/generate/route.ts`
- `src/components/dashboard/generate-document-actions.tsx`

### Modified files

- `src/app/api/widget/lead/route.ts` – trigger follow-up on lead submit and after qualification
- `src/app/api/widget/quote/route.ts` – trigger follow-up on quote submit
- `src/app/api/widget/chat/route.ts` – memory retrieval (inject into prompt), memory extraction (after reply), persist to lead when present
- `src/app/[locale]/dashboard/leads/page.tsx` – `FollowUpCard`, `MemoryCard`, `GenerateDocumentActions`
- `src/app/[locale]/dashboard/quote-requests/page.tsx` – no direct change (row actions in child)
- `src/app/dashboard/quote-requests/quote-request-row-actions.tsx` – Sheet with `FollowUpCard` and `GenerateDocumentActions`
- `src/app/[locale]/dashboard/documents/page.tsx` – “Generate document” card with dropdown
- `src/lib/follow-up/trigger-follow-up.ts` – `recordAiActionUsage` after successful run
- `src/app/api/documents/generate/route.ts` – entitlements check and `recordAiActionUsage`

---

## 2. Required migrations

Run (in order):

1. **20260331000000_ai_follow_up_memory_docs.sql**
   - Creates `ai_follow_up_runs` and `ai_memories`
   - Adds to `documents`: `quote_request_id`, `updated_at`, `metadata`, and trigger for `updated_at`

Apply via Supabase CLI: `supabase db push`  
Or in Supabase SQL Editor: run the contents of the migration file.

---

## 3. New environment variables

None. All features use existing configuration:

- **OpenAI**: `OPENAI_API_KEY`, optional `OPENAI_MODEL` (default `gpt-4o-mini`)

No new env vars were added.

---

## 4. How to test each feature manually

### AI Follow-Up Engine

1. **Trigger**
   - Submit a lead via the widget (or lead capture API) with valid `widgetId`, `name`, `email`.
   - Or submit a quote request via the widget/API.
   - Ensure `OPENAI_API_KEY` is set so the background follow-up run runs.
2. **Dashboard**
   - Go to **Dashboard → Leads**. Open a lead that was just created (or one that already has a follow-up run).
   - You should see an **AI follow-up** card (e.g. “Reply soon”, “High-value opportunity”) with summary, “Copy email draft”, “Create task”, “Add note”.
   - Switch to **Developer Mode** and confirm structured fields (recommended action, priority, draft task, etc.).
   - For **Quote requests**, click the message/square icon on a row to open the sheet; the same follow-up card appears there.
3. **Apply**
   - Click “Create task” or “Add note” and confirm a task or note is created and linked to the lead/quote.

### AI Memory

1. **Create memory**
   - Use the widget chat: have a short conversation (e.g. ask for a quote, mention budget or preference). Send several messages so the transcript is non-trivial.
   - After the AI replies, memory extraction runs in the background (no UI).
2. **Use memory**
   - In the same conversation (same `conversationId`), send another message. The model receives “Relevant context we have about this visitor/customer” in the system prompt if any memories were stored.
   - Submit a lead from that conversation (same conversation id). Then open **Dashboard → Leads** and open that lead. The **“What we know so far”** (Memory) card should list the extracted memories (if any).
3. **Developer**
   - In Developer Mode on the lead, memories show with type, confidence, and a delete (archive) control.

### AI Document / Quote Generator

1. **From a lead**
   - Go to **Dashboard → Leads**, open a lead.
   - Click **“Summarize this lead”** and/or **“Make a quote draft”**.
   - Check that a new document appears under **Dashboard → Documents** (and optionally that a toast shows the document name).
2. **From a quote request**
   - Go to **Dashboard → Quote requests**, open the follow-up/document sheet for a row.
   - Click **“Make a quote draft”**. Confirm a document is created and linked to the quote request (if your app shows `quote_request_id` / metadata).
3. **From Documents page**
   - Go to **Dashboard → Documents**. Use the **“Generate document”** dropdown and e.g. **“Generate proposal”** (generic, no source). A document should be created with business context only.
4. **Entitlements**
   - If the org has no AI actions or has exceeded the monthly AI action limit, **“Generate document”** should return 403 with a plan/upgrade message (and the UI can show an upgrade CTA).

---

## 5. Assumptions made

- **Follow-up**
  - Triggered only from widget lead and quote submission (and after lead qualification). No automatic trigger on “conversation milestone” (e.g. intent detection) yet; that can be added later.
  - Tasks/notes are created with `lead_id` / `contact_id` / `deal_id` from the follow-up run when present; no automatic CRM stage movement.
  - Email drafts are copy-only; no auto-send.

- **Memory**
  - `ai_memories` is used for the new cross-session memory; existing `memory_records` is unchanged.
  - Extraction runs after each AI reply (fire-and-forget) when transcript length &gt; 100 chars. No “every N messages” throttle.
  - Memories are stored for `conversation` and, when a lead exists for that conversation, also for `lead` so the lead page shows them.
  - Identity resolution: when a lead is created for a conversation, we persist the same extracted memories under both conversation and lead. No separate “migration” from visitor to lead; we duplicate at write time.

- **Documents**
  - Generated documents are saved into the existing `documents` table with `metadata.generation_type`, `source_type`, `source_id`, `generation_status`. Optional `quote_request_id` and existing `lead_id` / `deal_id` link the document to CRM.
  - Document generation is gated by `canUseAiActions` and `hasExceededMonthlyAiActions`; follow-up runs record AI usage but are not gated (they run from widget and should not block the response).

- **Billing**
  - Follow-up generation and document generation both call `recordAiActionUsage`. Widget chat continues to use `recordMessageUsage`; memory extraction does not record a separate usage (to avoid double-counting with chat).

- **RLS**
  - New tables use RLS with org-scoped policies. Widget/API writes use the admin client (service role) where needed; dashboard reads use the same policies.

- **Simple vs Developer Mode**
  - Follow-up and memory cards use `ViewModeClientGate` to show plain-language vs structured views. Document generation uses the same actions in both modes.
