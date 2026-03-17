# AI Setup Assistant Upgrade – Deliverables

## 1. Files Changed

### New files
- `src/lib/ai-setup/setup-actions.ts` – Setup action definitions and execution
- `src/lib/ai-setup/safe-actions.ts` – Safe vs confirm-first action model
- `src/app/api/ai-setup/quick-setup-from-website/route.ts` – Infer → draft → apply in one call
- `src/app/api/ai-setup/apply-safe-draft/route.ts` – Apply safe draft to live settings
- `docs/AI_SETUP_UPGRADE_DELIVERABLES.md` – This document

### Modified files
- `src/lib/ai-setup/prompt.ts` – Refactored to infer → draft → apply → confirm strategy; added quickSetupApplied option
- `src/app/api/ai-setup/sessions/[id]/chat/route.ts` – Quick-setup result handling; `quickSetupApplied` in system prompt
- `src/app/dashboard/ai-setup/ai-setup-client.tsx` – URL detection; auto-run quick-setup before chat when user sends website URL
- `src/lib/product-context.ts` – Updated `PLATFORM_CAPABILITIES_FOR_AI_SETUP` with setup operator capabilities
- `src/app/api/help-chat/route.ts` – Help prompt already contained AI Setup description (no structural change needed)

---

## 2. New Setup Assistant Actions / Tools

| Action | Description | Auto-apply | Requires confirmation |
|--------|-------------|------------|------------------------|
| `get_business_settings` | Read current business settings | — | — |
| `update_business_settings` | Update business name, description, services, FAQs, tone, contact, welcome message, brand color | ✓ (safe fields) | Only for destructive overwrites |
| `get_widget_config` | Read widget welcome message, color, logo | — | — |
| `get_agents` | List AI agents | — | — |
| `get_setup_status` | Planner draft vs live state | — | — |
| `analyze_website` | Fetch and analyze website content | — | — |
| `ingest_website_source` | Add website to knowledge base | ✓ | — |
| `apply_safe_setup_draft` | Apply safe draft fields to `business_settings` | ✓ | — |
| `update_planner_draft` | Update session planner config | Via chat JSON | — |
| `create_recommended_automation` | Create lead/quote notification automation | — | ✓ (always) |

---

## 3. User Actions the Assistant Can Perform Directly

When the user says things like:
- **"Set up from https://mybusiness.com"** → Quick-setup runs: analyze site, apply safe changes, ingest knowledge, update draft. User then sees a short confirmation.
- **"Make the tone more professional"** → AI outputs JSON; planner config is updated.
- **"Change the welcome message"** → AI outputs JSON with `widget_config.welcomeMessage`.
- **"Add phone number capture"** → AI outputs JSON with updated `capture_fields`.
- **"Use brand color #1a2b3c"** → AI outputs JSON with `widget_config.primaryColor`.
- **"Remove quote requests"** → AI outputs JSON to remove quote-related templates.
- **"Update my business hours"** → AI can propose updates; structured fields for hours would require schema changes.
- **"Add this service"** → AI outputs JSON if services are part of planner; otherwise handled via `update_business_settings`.
- **"Remove that FAQ"** → AI outputs JSON or updates planner; FAQs live in business_settings.

The assistant applies these via planner JSON updates. Actual writes to `business_settings` happen through:
1. Quick-setup (from URL)
2. Apply-safe-draft API
3. Publish (creates agent, widget, automations)

---

## 4. Auto-Apply vs Requires Approval

### Safe to auto-apply (no user confirmation)
- Business description
- Service list
- FAQs
- Welcome message draft
- Tone suggestion
- Recommended lead fields (in planner draft)
- Basic widget copy
- Knowledge draft from website ingestion
- Contact details (email, phone)

### Requires user confirmation
- **Publish** – User clicks Publish to go live.
- **Replacing existing settings** – Destructive overwrites of custom config are avoided by the prompt; user is asked when ambiguous.
- **Automations** – Creating automations that send external messages (email, webhook) requires explicit user approval.
- **Billing changes** – Not in scope for the assistant.
- **Deleting / overwriting custom config** – Assistant avoids this unless clearly requested.

---

## 5. Remaining Limitations (where manual editing is still needed)

1. **Capture fields** – Planner defines them, but the widget/lead API uses fixed schema (name, email, phone, message, etc.). Custom capture field schemas would need widget + backend changes.
2. **Quote intake configuration** – Quote variables and pricing profiles are managed in the Pricing dashboard; not fully driven by the setup assistant.
3. **Business hours** – No dedicated schema in `business_settings`; would need migration and UI.
4. **Automation creation** – Assistant can describe automations and update planner; actual creation is via Publish or manual setup in Automations.
5. **Widget position / layout** – Stored in `business_settings` (e.g. `widget_position_preset`); assistant does not yet expose direct controls.
6. **Multiple agents** – Assistant configures a single primary agent; multi-agent flows need the Agents dashboard.
7. **Tool calling** – Assistant uses JSON in chat responses, not OpenAI function tools. The setup actions are used by the quick-setup and apply-safe-draft APIs, not by live tool calls from the model.

---

## Success Criteria (met)

- **Website-based setup** – User pastes URL → assistant analyzes → drafts setup → applies safe changes.
- **Direct writes** – Quick-setup and apply-safe-draft write to `business_settings` and knowledge.
- **Reduced questions** – Prompt instructs: infer first, draft automatically, ask only when necessary.
- **Faster flow** – One URL input triggers analyze + draft + apply; user reviews and publishes.
- **Setup operator behavior** – Assistant follows infer → draft → apply → confirm instead of long question flows.
