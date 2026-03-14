# Automations: Polish, QA, Rollout & Extension Points

## 1. Polish summary (staff-engineer pass)

### Naming & single source of truth
- **Trigger/action labels:** Centralized in `src/lib/automations/labels.ts` (`TRIGGER_LABELS`, `ACTION_LABELS`, `getTriggerLabel`, `getActionLabel`). Dashboard list and create/edit modal import from here to avoid duplication.
- **Type guards:** `isValidTriggerType()` and `isValidActionType()` in `src/lib/automations/types.ts` used for validation instead of ad-hoc `.includes()`.

### Validation
- **Event type:** Engine validates `event_type` with `isValidTriggerType()` before querying; invalid types return early with a clear error.
- **Inbound webhook:** Payload size limited to `AUTOMATION_EVENT_PAYLOAD_MAX_BYTES` (100KB); invalid JSON returns 400 with `code: 'validation_error'`.
- **Webhook URL (runner):** `isValidWebhookUrl()` enforces http(s), max length 2048; in production, localhost and `http://127.*` are rejected.

### Error handling
- **Stored errors:** Runner uses `sanitizeErrorMessage()` (max 500 chars) so long or sensitive messages are not stored verbatim.
- **API responses:** Consistent `code` where useful (`plan_limit`, `auth_required`, `rate_limited`, `validation_error`, `payload_too_large`) for client handling.

### Security
- **Inbound webhook:** Rate limit by IP (120/min) and by secret prefix (60/min) to reduce brute-force and abuse.
- **Webhook URL:** Only http/https, no file or localhost in production.
- **Org scoping:** Run detail API and analytics verify organization via automation ownership.

### Copy & UX
- **Messages:** `recentRunsDescription`: “Click a run to see input, output, and trace”; `noRuns` and `templatesToGetStarted` tightened.
- **Dashboard:** Recent runs card description uses `recentRunsDescription` for hierarchy and clarity.

---

## 2. Identified weak spots

| Area | Risk | Mitigation / follow-up |
|------|------|-------------------------|
| **No idempotency** | Duplicate events can cause duplicate runs | Add optional `idempotency_key` to event payload; short-lived cache or DB check before running. |
| **No retry** | Transient failures (e.g. webhook timeout) are final | Add retry policy (e.g. in runner or queue layer) and optional `retry_count` on runs. |
| **Webhook secret** | Stored in plaintext in `business_settings` | Consider hashing with constant-time compare; rotate secret flow in UI. |
| **Run execution** | Synchronous in request; long actions can timeout | Move to background job (e.g. Vercel background, queue) for heavy or slow actions. |
| **Payload size** | 100KB may be high for some deployments | Make `AUTOMATION_EVENT_PAYLOAD_MAX_BYTES` configurable or lower by plan. |
| **Agent workflow** | No usage/billing for agent calls in automations | Integrate with `recordAiActionUsage` or equivalent when agent is invoked from runner. |

---

## 3. Final QA checklist

### Database
- [ ] All migrations applied in order: `20260317000000`, `20260318000000`, `20260318000001`, `20260318000002`.
- [ ] RLS: only org members see automations/runs; only owners/admins create/update/delete.
- [ ] `automation_runs` has `organization_id`, `trigger_event_type`, `trace_id`, `duration_ms`, `summary` (nullable).
- [ ] `business_settings.webhook_secret` nullable; `plan_entitlements` has `max_automations` per plan.

### API – Automations CRUD
- [ ] GET/POST /api/automations require auth; POST checks `canUseAutomation` and `canCreateAutomation`.
- [ ] At plan limit, POST returns 403 with `code: 'plan_limit'`.
- [ ] PATCH/DELETE /api/automations/:id scoped to org.

### API – Runs & observability
- [ ] GET /api/automations/runs supports `status`, `trigger_event_type`, `automation_id`, `limit`.
- [ ] GET /api/automations/runs/:id returns run detail; 404 when wrong org or missing.
- [ ] GET /api/automations/analytics returns totals and by_automation for period (24h/7d/30d).

### API – Triggers
- [ ] POST /api/automations/events: 401 without secret; 400 invalid event_type or JSON; 413 payload > 100KB; 429 when rate limited.
- [ ] POST /api/automations/form: requires widgetId; optional create_lead; emits form_submitted.
- [ ] POST /api/automations/cta: requires widgetId; cta_label; emits cta_clicked.

### Runner & engine
- [ ] qualify_lead_with_agent calls agent workflow with knowledge when agent_id set.
- [ ] call_webhook: validates URL; timeout 15s default; rejects invalid URL and localhost in production.
- [ ] Stored error_message truncated to 500 chars.
- [ ] Engine ignores invalid event_type without throwing.

### Dashboard
- [ ] Automations page: templates, your automations, analytics card, recent runs.
- [ ] Clicking a run opens detail modal (input, output, trace, error).
- [ ] Create/edit use shared trigger/action labels; validation and errors shown correctly.

### i18n
- [ ] EN and FR have `recentRunsDescription` and updated automations strings.

---

## 4. Rollout checklist

### Pre-deploy
- [ ] Run full QA above.
- [ ] Apply migrations on staging; verify RLS and indexes.
- [ ] Confirm `max_automations` values per plan (free 0, starter 2, pro 10, business 50, enterprise 200).
- [ ] Document webhook secret setup (Settings or API docs): set `webhook_secret` on business_settings for inbound webhook.

### Deploy
- [ ] Deploy app; run smoke: load automations page, create automation, run test, view run detail.
- [ ] Optional: feature flag or gradual rollout by plan if desired.

### Post-deploy
- [ ] Monitor error logs for `[automations/engine]`, `[automations]`, `automations/events`, `automations/form`, `automations/cta`.
- [ ] Verify inbound webhook with a test POST (secret + event_type + payload).
- [ ] Confirm analytics endpoint returns data after a few runs.

### Comms
- [ ] Notify users of new triggers (form, CTA, webhook) and where to find webhook secret if applicable.
- [ ] Document rate limits (events: 120/min by IP, 60/min by secret; form/cta per widget+IP).

---

## 5. Future extension points

### n8n integration
- **Outbound:** `call_webhook` already supports URL, method, headers, timeout. Point action_config.url to n8n webhook URL.
- **Inbound:** POST to `/api/automations/events` with `X-Webhook-Secret` and `event_type` + payload. n8n “Webhook” node can call this.
- **Extension:** Add action type `n8n_workflow` in `src/lib/automations/runner.ts` with `action_config.webhook_url` (and optionally workflow_id) and same HTTP call; or add `action_config.provider: 'n8n'` and keep single `call_webhook` with n8n URL.
- **Placeholder:** In runner, add a `// TODO: n8n sync/bridge` comment where a future n8n-specific step (e.g. wait for n8n callback) could be added.

### API automation management
- **Current:** REST CRUD on `/api/automations` and `/api/automations/:id`; list runs, run detail, analytics.
- **Extension:** Add API key auth (e.g. `hasApiAccess` + API key header) and document for programmatic create/update/delete of automations.
- **Placeholder:** In `src/app/api/automations/route.ts`, add comment: `// TODO: API key auth for programmatic management when api_access entitlement is used.`

### CRM integrations
- **Current:** `save_lead_record` and `handoff_to_human` are placeholders; lead data is in run input and can be sent via `call_webhook` to a CRM webhook.
- **Extension:** Add action types e.g. `crm_create_contact`, `crm_add_note` in runner; implement in `executeAction()` with CRM client (e.g. HubSpot, Pipedrive) using org-level credentials stored in integrations or env.
- **Placeholder:** In runner, add `// TODO: CRM action types: crm_create_contact, crm_add_note; credentials from integrations or env.`

### Scheduled jobs
- **Current:** No cron; `schedule_triggered` exists as trigger type but nothing emits it.
- **Extension:** Add a cron route (e.g. Vercel cron or external scheduler) that: (1) finds automations with `trigger_type = 'schedule_triggered'` and `trigger_config.cron` or `trigger_config.schedule`; (2) for each due run, calls `emitAutomationEvent` with `event_type: 'schedule_triggered'` and payload (e.g. schedule key, time).
- **Placeholder:** New file `src/app/api/cron/automations-schedule/route.ts` (or similar) with comment: `// TODO: Query automations where trigger_type = schedule_triggered and trigger_config defines schedule; emit schedule_triggered events. Secure with CRON_SECRET.`
- **Schema:** Optional migration to add `trigger_config.schedule` (e.g. daily, weekly, cron expression) and document format.

### Human approval / branching
- **Current:** Linear flow: one trigger → one action per automation.
- **Extension:** Add `automation_steps` and `automation_run_steps` (migration already scoped in audit); add step types `branch_if`, `delay_step`, `human_approval`; runner executes steps in order and branches on conditions. Requires workflow engine changes and UI for step editor.
- **Placeholder:** In `docs/AUTOMATIONS_ARCHITECTURE_AUDIT.md` or this doc: “Multi-step and branching: extend with automation_steps table and step executor; branch_if and human_approval as future step types.”

---

## 6. File change summary (polish pass)

| File | Change |
|------|--------|
| `src/lib/automations/types.ts` | Added `isValidTriggerType`, `isValidActionType`, `AUTOMATION_EVENT_PAYLOAD_MAX_BYTES`. |
| `src/lib/automations/labels.ts` | **New.** Shared trigger/action labels and getters. |
| `src/lib/automations/engine.ts` | Validate `event_type` with `isValidTriggerType` before querying. |
| `src/lib/automations/runner.ts` | `sanitizeErrorMessage()`, `isValidWebhookUrl()`; webhook URL validation; error message capped. |
| `src/app/api/automations/events/route.ts` | Payload size limit; rate limit by IP and secret; JSON parse try/catch; consistent error codes. |
| `src/app/api/automations/route.ts` | Simplified 403 body (code only). |
| `src/app/dashboard/automations/automations-list.tsx` | Use `getTriggerLabel`, `getActionLabel` from labels. |
| `src/app/dashboard/automations/create-automation-modal.tsx` | Use shared labels; removed local TRIGGER_LABELS/ACTION_LABELS. |
| `src/app/dashboard/automations/automations-dashboard-client.tsx` | Recent runs card uses `recentRunsDescription`. |
| `messages/en.json` | `recentRunsDescription`, `templatesToGetStarted`, `noAutomations`, `noRuns` copy tweaks. |
| `messages/fr.json` | `recentRunsDescription` added. |
| `docs/AUTOMATIONS_POLISH_QA_AND_ROLLOUT.md` | **New.** This document. |
