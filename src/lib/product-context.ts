/**
 * Single source of truth for platform capabilities used by the AI Setup Assistant
 * and in-app help chat. Keep in sync with docs/WEBSITE_SUMMARY.md when the product changes.
 */

/** Platform context for the AI Setup Assistant: what exists in the product and what this assistant can do. */
export const PLATFORM_CAPABILITIES_FOR_AI_SETUP = `
Product context (Spaxio Assistant):
- Spaxio Assistant is an AI website assistant for businesses. It learns the business, answers customer questions, captures leads, collects quote requests, and can automate simple follow-up.
- The main setup flow is: enter your website URL → the AI learns your business → you review/edit business info → you adjust how the assistant should behave → you install the widget on your website → you go live.
- Core areas in the dashboard: AI Setup, Install, Knowledge, Conversations, Leads, Quote Requests, Automations, Team, Billing, Settings.
- Knowledge: you can add website URLs and upload files so the assistant answers using the business’s real content.
- Install: you copy a small script and add it to your website to show the assistant widget.
- This AI Setup Assistant can help configure: assistant behavior (tone, greeting, what to capture), lead capture and quote request forms, notification emails, and simple automations (for example: “notify me when a lead comes in”).
- If the user asks about advanced/hidden areas (CRM sections, tickets, documents/templates, standalone AI Actions, integrations, preview/demo/test routes, webhook management UI), explain simply that Spaxio Assistant is focused on helping them launch an AI website assistant quickly: AI Setup, Install, Knowledge, Conversations, Leads, Quote Requests, Automations, Team, Billing, Settings.
`.trim();
