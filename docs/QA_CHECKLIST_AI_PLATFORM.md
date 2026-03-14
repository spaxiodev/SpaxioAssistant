# QA Checklist — Spaxio AI Platform Refactor

Use this after applying the migration and deploying.

## 1. Database

- [ ] Run migration `20260321000000_ai_platform_pillars.sql` (e.g. `supabase db push` or apply in SQL editor).
- [ ] Verify new tables exist: `agent_runs`, `agent_messages`, `agent_tool_invocations`, `knowledge_bases`, `knowledge_index_runs`, `webhook_endpoints`, `webhook_events`, `webhook_field_mappings`, `contacts`, `companies`, `deals`, `tasks`, `notes`, `activities`, `document_templates`, `documents`, `memory_records`, `deployment_configs`, `extraction_schemas`, `extraction_runs`, `automation_nodes`, `automation_edges`, `analytics_events`.
- [ ] Verify extended columns on `agents` (goal, tone, linked_knowledge_source_ids, etc.), `leads` (status, stage, owner_id, tags), `organization_members` (new roles).
- [ ] RLS: Log in as a member and confirm you can only see your org’s data for new tables.

## 2. Navigation and copy

- [ ] Sidebar shows: Overview, Agents, Automations, Knowledge, CRM (Leads, Contacts, Companies, Deals, Tickets, Quote requests), Conversations, Documents, Analytics, Deployments, Integrations, Install, Settings, Billing.
- [ ] No “Assistant” in main nav; no “n8n” in UI or copy.
- [ ] Home and metadata position Spaxio as “AI infrastructure platform for modern businesses”.
- [ ] Dashboard overview description and analytics description use new copy.

## 3. New dashboard pages

- [ ] **Contacts** — List loads (empty or from `contacts`); no console errors.
- [ ] **Companies** — List loads; no errors.
- [ ] **Deals** — List loads; stage and value display.
- [ ] **Tickets** — List loads from `support_tickets`; status/priority shown.
- [ ] **Documents** — Templates and recent documents sections; empty states or data.
- [ ] **Deployments** — Empty state or list of deployment configs; link to agents.

## 4. Agents

- [ ] Agent list and create flow unchanged.
- [ ] Agent detail page has tabs: Overview, Instructions, Tools, Knowledge, Memory, Deployment, Testing, Analytics.
- [ ] Overview tab shows existing agent config and enabled tools.
- [ ] Analytics tab shows “No runs yet” or list of `agent_runs` when present.
- [ ] Role types include new options (e.g. sales_agent, booking_agent) in types; UI may still show subset.

## 5. Automations

- [ ] Automations list and create/edit still work.
- [ ] Step editor shows “Call external URL” (not “n8n workflow”); webhook URL field works.
- [ ] Test run and run history still work; no references to n8n in labels or logs.

## 6. Knowledge

- [ ] Knowledge page still works; sources list and add source/URL/upload.
- [ ] If you added `knowledge_base_id` to sources, existing sources remain valid (nullable).

## 7. CRM

- [ ] Leads page still works; new columns (status, stage, etc.) don’t break the list.
- [ ] Quote requests unchanged.
- [ ] Conversations unchanged.

## 8. Analytics

- [ ] Analytics page loads; cards for conversations, messages, leads, quote requests, automation runs, tickets.
- [ ] “Recent automation runs” section appears when there are runs with `organization_id` set.

## 9. Integrations

- [ ] Integrations page shows updated copy (no n8n); mentions webhooks and API keys.

## 10. Permissions and i18n

- [ ] Only org members can access dashboard; new pages respect same auth.
- [ ] French (and other locales) have keys for new nav items and empty states; no missing translation keys in sidebar or new pages.

## 11. Regression

- [ ] Widget chat still works (same widget/agent resolution).
- [ ] Automation webhook trigger and run still work.
- [ ] Billing and account pages unchanged.
- [ ] Install/embed code and settings still work.

## Priority order for manual QA

1. Apply migration and confirm DB.
2. Navigation and new pages (contacts, companies, deals, tickets, documents, deployments).
3. Agent detail tabs and analytics run history.
4. Automations (no n8n, call_external_url).
5. Analytics dashboard counts and recent runs.
6. Full regression (widget, automation run, billing, i18n).
