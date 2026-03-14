# Spaxio AI Platform — Architecture

Spaxio is built as an **AI infrastructure platform for businesses**, not a relay to third-party workflow engines. All core workflow logic, AI orchestration, data handling, agent execution, storage, CRM actions, knowledge retrieval, and automation execution run inside Spaxio.

## Product pillars

1. **AI Agents** — Create, configure, and run multiple AI agents (sales, support, qualification, FAQ, etc.) with instructions, tools, knowledge, and memory.
2. **Automation Builder** — Native drag-and-drop workflows with triggers (webhook, form, lead, chat, etc.), logic blocks (if/else, delay, AI classifier), and actions (CRM, email, run agent, generate document).
3. **Knowledge Engine** — Knowledge bases and sources (crawl, upload, paste); chunking, embeddings, and retrieval for RAG.
4. **Native CRM** — Leads, contacts, companies, deals, tickets, tasks, notes, activities; pipelines and ownership.
5. **Actions / Tools Layer** — Standardized tools (create lead, send email, create ticket, query knowledge, etc.) used by agents and automations; audit logging.
6. **Analytics** — Aggregated metrics across conversations, agent runs, automation runs, CRM, and documents.
7. **Integrations** — Webhooks, API keys, and external URLs; no dependency on external workflow engines as the core.
8. **Document Generation** — Templates, variable insertion, generated documents linked to CRM and runs.
9. **Memory System** — Short-term and long-term memory for agents and contacts; configurable per agent.
10. **Embeddable Deployment** — Website widget, embedded chat, standalone page, dashboard panel, API.

## Data model (high level)

- **Tenancy:** `organizations` (workspace); `organization_members` with roles: owner, admin, manager, agent_operator, member, viewer.
- **Agents:** `agents` (config, model, tools, linked knowledge/automations, memory flags); `agent_runs`, `agent_messages`, `agent_tool_invocations`.
- **Automations:** `automations` (trigger/action config, steps); `automation_steps`, `automation_runs`, `automation_run_steps`; `automation_nodes`, `automation_edges` for visual builder.
- **Knowledge:** `knowledge_bases`; `knowledge_sources`, `knowledge_documents`, `knowledge_chunks`, `document_embeddings`; `knowledge_index_runs`.
- **Webhooks:** `webhook_endpoints`, `webhook_events`, `webhook_field_mappings`.
- **CRM:** `leads` (status, stage, owner, tags), `contacts`, `companies`, `deals`, `support_tickets`, `tasks`, `notes`, `activities`.
- **Documents:** `document_templates`, `documents`.
- **Memory:** `memory_records` (entity_type, entity_id, scope, content).
- **Deployments:** `deployment_configs` (per agent, deployment_type, config).
- **Analytics:** `analytics_events` (optional event log); metrics derived from runs, conversations, CRM.

## Execution flow

- **Agent:** User input / event → load instructions and context → optional knowledge retrieval → optional tool calls → response or action output. Run history stored in `agent_runs` and `agent_messages`.
- **Automation:** Trigger (webhook, form, lead, etc.) → match automations → create run → execute steps (action, delay, branch) → update run status; variable interpolation `{{trigger.x}}`, `{{lead.email}}`.
- **Tools:** Same registry used by widget chat and automation runner; each tool has parameters, execution handler, and can log to `agent_tool_invocations` or run steps.

## Tradeoffs

- **Single-org per user (current):** First organization is used; org switcher can be added later. Keeps auth simple.
- **Automation engine:** Current implementation is step-based (linear + branch/delay); node/edge graph is in DB for future visual builder; execution can be extended to walk the graph.
- **Knowledge:** One knowledge_base can group multiple sources; sources can exist without a base (backward compatible). Embeddings are OpenAI 1536-dim; abstraction in place for swapping provider.
- **CRM:** Leads remain the primary capture entity; contacts/companies/deals extend the model. Pipelines (lead stage, deal stage, ticket status) are stored as enums; custom stages would require schema or config extension.
- **Document generation:** Templates and generated documents are stored; PDF/file generation is architecture-ready (file_url); actual PDF rendering can be added via a library or external service.

## Environment variables

No new required env vars for the new pillars. Existing:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (and optional others for models)
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (email actions)
- Stripe for billing

## Regenerating DB types

After applying migrations:

```bash
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

Then extend the `Database` interface if you add new tables so that Row/Insert/Update types are available.
