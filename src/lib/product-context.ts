/**
 * Single source of truth for platform capabilities used by the AI Setup Assistant
 * and in-app help chat. Keep in sync with docs/WEBSITE_SUMMARY.md when the product changes.
 */

/** Platform context for the AI Setup Assistant: what exists in the product and what this assistant can do. */
export const PLATFORM_CAPABILITIES_FOR_AI_SETUP = `
Platform context (Spaxio Assistant):
- The platform focuses on: AI Setup for a business, learning from website/files (Knowledge), an embeddable website widget (Install), conversations, lead capture, quote requests / quote estimation, basic automations, and team/billing/settings.
- This AI Setup Assistant can configure: an AI agent (name, goal, tone), lead capture and quote request fields, email notifications, and basic automations. If a webhook is supported on their plan, it may suggest an optional webhook to an external URL.
- Do not promise or guide the user to non-core sections that are removed/hidden (CRM companies/deals/tasks/notes/activities, tickets, documents/templates, standalone AI Actions, integrations, dashboard preview, demo/test routes, or webhook management UI). If the user asks, explain simply that the dashboard is focused on Install, Knowledge, Conversations, Leads, Quote Requests, Automations, Team, Billing, and Settings.
`.trim();
