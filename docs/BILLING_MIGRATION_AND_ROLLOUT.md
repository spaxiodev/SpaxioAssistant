# Multi-Tier Billing: Migration and Rollout

This document covers migration of existing Assistant Pro subscribers to the new plan/entitlements system and how to roll out the new tiers safely.

## Migration (existing production)

### 1. Run new migrations

Apply in order:

- `supabase/migrations/20260316000000_plans_and_entitlements.sql` — creates `plans`, `plan_entitlements`, `org_usage`, adds `subscriptions.plan_id`
- `supabase/migrations/20260316000002_usage_increment_rpc.sql` — RPCs for usage increment
- `supabase/migrations/20260316000001_backfill_subscription_plan_id.sql` — backfills `plan_id` on existing rows

With Supabase CLI:

```bash
supabase db push
```

Or run each migration file in the SQL Editor.

### 2. Backfill behavior

- Rows with `stripe_subscription_id` set and `status IN ('active','trialing')` get `plan_id` = **Legacy Assistant Pro** (same entitlements as Pro).
- All other rows get `plan_id` = **Free**.

Existing $29/month (Assistant Pro) customers keep full access; no change to their Stripe price until they use the Customer Portal to switch plans.

### 3. Stripe price mapping

- **Legacy**: Current production price ID (env `STRIPE_PRICE_ID`) maps to plan `legacy_assistant_pro` in code (see `src/lib/billing/price-to-plan.ts` and `src/lib/entitlements.ts`). Do not remove this mapping.
- **New tiers**: Create products/prices in Stripe for Starter ($29), Pro ($79), Business ($199). Then either:
  - Set `plans.stripe_price_id` in the DB for each plan, or
  - Set env vars: `STRIPE_PRICE_ID_STARTER`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_BUSINESS` (optional; used when plan row has no `stripe_price_id`).

## Testing checklist

Before going live with new plans:

- [ ] **Existing paid customer**: Log in as an org with an active $29 subscription. Confirm dashboard shows “Legacy Assistant Pro” or “Pro / Growth” and all features (agents, knowledge, tools, etc.) still work.
- [ ] **Free/trialing org**: Create or use an org with no Stripe subscription or canceled. Confirm plan shows as Free, and limits (e.g. 1 agent, message cap) are enforced with clear upgrade prompts.
- [ ] **Upgrade flow**: From billing or pricing page, start checkout with `planId: 'starter'` (or pro/business). Complete Stripe Checkout; confirm webhook runs and `subscriptions.plan_id` is set; confirm entitlements match the new plan.
- [ ] **Usage**: Send widget messages and use a tool; confirm “Billing debug” (admin) shows incremented `message_count` and `ai_action_count` for the current month.
- [ ] **Enforcement**: As Free, try to create a second agent, add a second knowledge source, or enable webhook on an agent; confirm 403 with `code: 'plan_limit'` and friendly message.
- [ ] **Message limit**: As Free, exceed 100 messages in the period (or temporarily lower the limit in `plan_entitlements` for testing); confirm widget returns `message_limit_reached` and does not process the message.
- [ ] **Admin bypass**: With `ADMIN_USER_IDS` set, confirm admin users can use all features and see Billing debug regardless of plan.

## Rollout checklist

1. **Pre-deploy**
   - [ ] Run all new migrations on staging/production DB.
   - [ ] Confirm Stripe webhook endpoint is configured for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
   - [ ] (Optional) Create new Stripe products/prices for Starter, Pro, Business and set `STRIPE_PRICE_ID_*` or `plans.stripe_price_id`.

2. **Deploy app**
   - [ ] Deploy code (entitlements, usage recording, enforcement, pricing page, billing page updates).
   - [ ] Verify no errors in logs; trigger a test webhook with Stripe CLI if needed.

3. **Post-deploy**
   - [ ] Spot-check one existing paying customer: plan name and status correct, chat and features work.
   - [ ] Spot-check one Free org: limits enforced, upgrade CTAs visible.
   - [ ] Confirm pricing page shows five tiers and “Current plan” badge when logged in.

4. **Communicate**
   - [ ] Notify existing customers that plan structure has expanded; they remain on Legacy Assistant Pro (same features) until they change plan in the Customer Portal.
   - [ ] Document in support/help: how to upgrade/downgrade, where to see usage (admin debug or future usage dashboard).

## Files reference

- **Plans & entitlements**: `src/lib/entitlements.ts`, `src/lib/billing/price-to-plan.ts`
- **Usage recording**: `src/lib/billing/usage.ts`; RPCs in `supabase/migrations/20260316000002_usage_increment_rpc.sql`
- **Stripe**: `src/app/api/billing/checkout/route.ts` (accepts `planId`/`priceId`), `src/app/api/billing/webhook/route.ts` (sets `plan_id`)
- **Enforcement**: agents, knowledge/sources, knowledge/upload, tools/run, agents/[id] (webhook), widget chat (message/AI limits)
- **UI**: `src/app/[locale]/pricing/page.tsx`, `src/app/[locale]/dashboard/billing/page.tsx`, `src/components/ui/dark-gradient-pricing.tsx`
