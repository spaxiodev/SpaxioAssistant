# Automations MVP – Testing & Rollout

## Summary

The Automations section is a real dashboard where users can:

- View automation templates and create automations from them
- Create/edit automations with trigger type, action type, linked agent, and status
- Enable/pause, edit, duplicate, delete automations
- Run a manual test and see runs in "Recent runs"
- Prepare for future n8n/webhook execution

## Testing Checklist

### Database

- [ ] Run migration `20260317000000_automations_tables.sql` (creates `automations`, `automation_runs` with RLS)
- [ ] Verify RLS: only org members can read; only owners/admins can insert/update/delete
- [ ] Verify `automation_runs` policies scope by `automation_id` → org via `automations.organization_id`

### API

- [ ] **GET /api/automations** – returns list of automations for current org; 403 when unauthenticated
- [ ] **POST /api/automations** – creates automation; 403 when `canUseAutomation` is false (e.g. Free/Starter)
- [ ] **GET /api/automations/:id** – returns one automation; 404 when wrong org or missing
- [ ] **PATCH /api/automations/:id** – updates name, status, trigger, action, agent_id; 404 when wrong org
- [ ] **DELETE /api/automations/:id** – deletes automation and cascades runs; 404 when wrong org
- [ ] **POST /api/automations/:id/toggle** – flips active ↔ paused; 404 when wrong org
- [ ] **POST /api/automations/:id/test** – creates a run, executes action (placeholder/webhook), returns run_id and status; 403 when automations not on plan
- [ ] **GET /api/automations/runs** – returns recent runs with `automation_name`; optional `?automation_id=...` and `?limit=...`

### UI

- [ ] **Dashboard** – Hero text, "Create Automation" button, template cards, "Your automations" list, "Recent runs" section
- [ ] **Templates** – Clicking a template opens create modal with name, trigger, action prefilled
- [ ] **Create** – Form: name, description, template, agent, trigger, action, status; Save creates via POST
- [ ] **Edit** – From list dropdown, Edit opens same modal with automation data; Save calls PATCH
- [ ] **List** – Each row: name, status badge, trigger → action, linked agent, last run; actions: Test, Enable/Pause, Edit, Duplicate, Delete
- [ ] **Recent runs** – Shows automation name, status, time; error message when failed
- [ ] **Empty states** – No automations yet; No runs yet
- [ ] **i18n** – EN/FR keys used for dashboard automations (createAutomation, yourAutomations, recentRuns, status labels, etc.)

### Execution

- [ ] **Manual test** – Click "Test run" on an automation; run appears in Recent runs with status success/failed
- [ ] **call_webhook** – If action is call_webhook and action_config has `url`, runner POSTs to that URL (n8n-ready)
- [ ] **Other actions** – qualify_lead_with_agent, send_email_notification, etc. return placeholder success (extend later)

### Entitlements

- [ ] **canUseAutomation** – Used in POST create and POST test; Pro and above have automations_enabled
- [ ] Templates and list are visible to all; creation and test are gated

## Rollout Checklist

- [ ] Apply migration in staging and production
- [ ] Deploy app; verify automations page loads and create/edit/toggle/test work
- [ ] Confirm plan_entitlements has `automations_enabled` for Pro/Business/Enterprise (already in `20260316000000_plans_and_entitlements.sql`)
- [ ] Optional: add onboarding hint or tooltip for first-time automations users

## Future n8n Integration Points

The codebase is structured so you can plug in n8n without rewriting the automations feature:

1. **Trigger: webhook_received**  
   Add an inbound webhook route (e.g. `POST /api/webhooks/automations/:id` or by trigger_config path) that looks up the automation, builds `AutomationRunInput`, and calls `runAutomation()` from `@/lib/automations/runner`.

2. **Action: call_webhook**  
   Already implemented in `runner.ts`: if `action_config.url` is set, the runner POSTs the input payload to that URL. Point it to an n8n webhook URL to trigger an n8n workflow.

3. **Execution layer**  
   `runAutomation()` in `@/lib/automations/runner.ts` is the single entry: it creates a run, calls `executeAction()`, and updates the run. To delegate to n8n:
   - Add an action type e.g. `n8n_workflow` with `action_config.webhook_url` or `workflow_id`.
   - In `executeAction()`, POST to n8n (or n8n API), wait for response, and return result as `AutomationRunOutput`.

4. **Event payload**  
   `AutomationRunInput` in `@/lib/automations/types.ts` defines the shape (trigger_type, conversation_id, lead, etc.). Use the same shape when emitting from widget (e.g. "contact captured") or from your backend so n8n receives a consistent payload.

5. **Templates**  
   New templates can be added in `@/lib/automations/templates.ts` with trigger_type `webhook_received` and action_type `call_webhook` and default action_config pointing to an n8n webhook.

No changes to the automations dashboard UI are required for basic n8n integration; only backend/runner and optional new trigger endpoints.
