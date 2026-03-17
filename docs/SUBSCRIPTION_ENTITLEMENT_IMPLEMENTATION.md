# Subscription Entitlement & Usage Enforcement – Implementation Summary

This document summarizes the subscription access and usage enforcement system implemented for Spaxio Assistant.

---

## 1. Files Created / Changed

### Created
- **`src/lib/billing/subscription-access.ts`** – Central subscription access service:
  - `getOrganizationSubscriptionAccess(organizationId, adminAllowed)` – full access object (plan, billing status, trial, entitlements, usage, blocked reasons, upgrade recommendations)
  - `getOrganizationPlan`, `getOrganizationEntitlements`, `getUsageStatus`
  - `canUseFeature(organizationId, featureKey, adminAllowed)`
  - `assertFeatureAccess`, `assertUsageAvailable` – return `NextResponse` on failure
  - `getUpgradeReason`, `planLimitResponse`
- **`supabase/migrations/20260402000000_subscription_entitlements_usage.sql`** – Plan entitlement updates (ai_pages_enabled, max_ai_pages), FREE/STARTER/PRO/BUSINESS limit alignment, `usage_events` table
- **`docs/SUBSCRIPTION_ENTITLEMENT_IMPLEMENTATION.md`** – This file

### Modified
- **`src/lib/entitlements.ts`** – Added `ai_pages_enabled`, `max_ai_pages` to `Entitlements` and `DEFAULT_ENTITLEMENTS`; `getCurrentUsage` now includes `ai_pages_count`; new `canCreateAiPage`
- **`src/lib/billing/usage.ts`** – Added `incrementUsage`, `getCurrentUsagePeriod`, `IncrementUsageParams`; `recordMessageUsage` / `recordAiActionUsage` unchanged (RPC-only)
- **`src/lib/api-plan-error.ts`** – Extended `PlanUpgradeErrorBody` with `reason`, `recommendedPlan`; added `planLimitResponse`
- **`src/app/api/billing/webhook/route.ts`** – Logs when Stripe price ID is unknown or missing
- **`src/app/api/widget/chat/route.ts`** – Tool calling gated by `canUseToolCalling`; over AI action limit returns 403 with structured body
- **`src/app/api/webhooks/endpoints/route.ts`** – POST guarded by `hasWebhookAccess`; returns `planUpgradeRequiredResponse` when not allowed
- **`src/app/api/automations/events/route.ts`** – Inbound webhook requires `hasWebhookAccess` before `canUseAutomation`
- **`src/app/api/dashboard/ai-pages/route.ts`** – POST guarded by `canCreateAiPage`; returns `planUpgradeRequiredResponse` when not allowed
- **`src/app/api/tools/run/route.ts`** – Tool calling denial returns `planUpgradeRequiredResponse` with plan/recommended plan
- **`src/app/[locale]/dashboard/billing/page.tsx`** – Uses `getOrganizationSubscriptionAccess`; adds “Usage this period” card (messages, AI actions, progress, period dates, blocked reason + upgrade CTA); admin debug section uses access object
- **`src/lib/plan-config.ts`** – Added `ai_pages` to `FEATURE_KEYS`, `FEATURE_MIN_PLAN` (pro), `FEATURE_LABELS`
- **`messages/en.json`**, **`messages/fr.json`**, **`messages/fr-CA.json`** – New keys: `usageThisPeriod`, `usagePeriodDescription`, `messages`, `aiActions` (billing context)

---

## 2. Migrations

- **`20260402000000_subscription_entitlements_usage.sql`**
  - Inserts/updates `ai_pages_enabled` and `max_ai_pages` for free, starter, pro, business, enterprise, legacy_assistant_pro
  - Updates FREE: `monthly_ai_actions` = 25, `max_team_members` = 1
  - Updates STARTER: `max_team_members` = 2, `max_knowledge_sources` = 3
  - Updates PRO: `max_team_members` = 5, `max_knowledge_sources` = 10
  - Updates BUSINESS: `max_team_members` = 25
  - Creates `usage_events` (id, organization_id, metric, amount, source, source_id, metadata, usage_period_start, usage_period_end, idempotency_key, created_at) with RLS policy for service role

Run with your usual migration flow (e.g. `supabase db push` or run the SQL file in the SQL editor).

---

## 3. Env Vars

No new required env vars. Existing usage remains:

- **`STRIPE_SECRET_KEY`**, **`STRIPE_WEBHOOK_SECRET`** – Billing and webhooks
- **`STRIPE_PRICE_ID`** – Legacy price → `legacy_assistant_pro`
- **`STRIPE_PRICE_ID_STARTER`**, **`STRIPE_PRICE_ID_PRO`**, **`STRIPE_PRICE_ID_BUSINESS`** – Optional; else use `plans.stripe_price_id` in DB
- **`ADMIN_USER_IDS`** – Comma-separated user IDs for plan/limit bypass

---

## 4. How to Test Plan Enforcement Manually

1. **Free plan (no subscription or trialing ended)**  
   Use an org with no active subscription (or set subscription to `canceled`).  
   - Widget chat should return `subscription_required` or equivalent.  
   - Create agent/knowledge source/team invite/AI page/webhook/automation should return 403 with `plan_limit` / `PLAN_UPGRADE_REQUIRED` and `currentPlan` / `requiredPlan` when over limit or feature not allowed.

2. **Message limit**  
   Set `org_usage.message_count` for current month to `monthly_messages` for the org’s plan.  
   - Send a widget message → expect 403 with `message_limit_reached` and upgrade payload.

3. **AI action limit**  
   Set `org_usage.ai_action_count` to `monthly_ai_actions`.  
   - Widget chat with tool-using agent → expect 403 with `ai_action_limit_reached` and upgrade payload.  
   - `/api/tools/run` or doc gen/follow-up should also be blocked when over limit (if you add the check there; widget chat is implemented).

4. **Tool calling**  
   Use an org on Free or Starter (no `tool_calling_enabled`).  
   - Widget with tools enabled should get non-tool responses only.  
   - POST `/api/tools/run` → 403 with `plan_limit`, `feature: 'tool_calling'`, `recommended_plan`.

5. **Webhooks**  
   On Free/Starter, POST `/api/webhooks/endpoints` → 403 “Webhooks are not available on your plan”.

6. **Automations**  
   On Free/Starter, POST `/api/automations` → 403.  
   POST `/api/automations/events` with org’s webhook secret on a plan without `webhook_access` → 403.

7. **AI Pages**  
   On Free/Starter, POST `/api/dashboard/ai-pages` → 403.  
   On Pro with 1 AI page already, create another → 403 (max_ai_pages).

8. **Admin bypass**  
   Add the user’s ID to `ADMIN_USER_IDS`.  
   Same org should be able to use features and not hit limits (admin bypass in all checks).

---

## 5. How to Test Stripe Mapping Manually

1. **Webhook**  
   - In Stripe Dashboard, send `customer.subscription.updated` (or `checkout.session.completed`) with a known price ID that exists in `plans.stripe_price_id` or in env (`STRIPE_PRICE_ID`, `STRIPE_PRICE_ID_STARTER`, etc.).  
   - Check `subscriptions` row for that customer/org: `plan_id` should be set and `stripe_price_id` updated.

2. **Unknown price**  
   - Send a webhook with a price ID that is not in `plans` and not in env.  
   - Server logs should show: `[billing/webhook] Unknown Stripe price ID, subscription may have wrong plan` with `priceId`, `orgId`, `subscriptionId`.  
   - `plan_id` will be null; org falls back to Free via `getPlanForOrg`.

3. **Checkout**  
   - Start checkout with `planId: 'starter'` (or similar).  
   - Complete in Stripe; webhook runs and `subscriptions.plan_id` should match the plan for that price.

---

## 6. Assumptions

- **Billing period** – Usage is calendar-month (`period_start` / `period_end` from first/last day of month). Subscription `current_period_end` from Stripe is used for display only; usage limits are not aligned to Stripe period (can be done later).
- **Legacy Assistant Pro** – Still mapped from `STRIPE_PRICE_ID`; receives same entitlements as Pro (including `ai_pages_enabled`, `max_ai_pages` = 1).
- **Trials** – `status = 'trialing'` and `trial_ends_at` in future → treated as active; after trial end, access falls back to Free unless there is an active paid subscription.
- **past_due** – Stored in `subscriptions.status`; no special “reduced access” logic; `getPlanForOrg` still uses `plan_id` so entitlements stay until you add explicit past_due handling.
- **usage_events** – Optional audit log; inserts only when `incrementUsage` is called with `source` or `idempotencyKey`. High-volume paths (e.g. widget message) keep using `recordMessageUsage` (RPC only) to avoid extra writes.
- **Feature keys** – `plan-config` and sidebar use `FEATURE_KEYS` / `FEATURE_MIN_PLAN`; API enforcement uses entitlements (and helpers in `entitlements.ts` / `subscription-access.ts`). Both are kept in sync (e.g. ai_pages = Pro).
- **Custom branding** – Entitlement `custom_branding` is read in `subscription-access.canUseFeature('custom_branding')`; no new UI or API enforcement was added beyond existing branding checks.

---

## 7. Recommended Follow-ups

- **Align usage period to Stripe** – Optionally set `period_start` / `period_end` from `subscriptions.current_period_end` (or derive from it) so “usage this period” matches the billing period.
- **Enforce AI action limit in other APIs** – Documents generate, follow-up, website auto-setup, etc. already call `recordAiActionUsage`; add `assertUsageAvailable(..., 'ai_actions')` (or equivalent) at the start of those handlers so they return 403 when over limit.
- **Overage / add-ons** – Design add-on products (e.g. extra messages pack) and optional `plan_entitlements` overrides or add-on rows; `getOrganizationSubscriptionAccess` can merge add-ons into limits later.
- **Billing page “included / locked” list** – Optionally render a list of features (from `access.entitlements` or `FEATURE_KEYS`) with check/cross and “Available on Pro” style labels.
- **Regenerate types** – Run `npx supabase gen types typescript` and add `usage_events` (and any other new tables) to `database.types.ts` if you want full typing for `usage_events` inserts.
