import type { BlogPost } from '../types';

export const post: BlogPost = {
  meta: {
    slug: 'ai-crm-automation-small-businesses',
    title: 'AI CRM Automation for Small Businesses',
    description:
      'How small businesses can use AI CRM automation to capture leads from chat, reduce manual data entry, and trigger follow-up workflows—without a big IT team.',
    date: '2025-03-04',
    readTimeMinutes: 5,
    author: 'Spaxio',
    category: 'CRM',
    tags: ['AI CRM', 'automation', 'small business', 'leads'],
    relatedSlugs: [
      'ai-agents-lead-generation',
      'how-businesses-use-ai-infrastructure-to-scale',
      'ai-customer-support-automation-explained',
    ],
  },
  sections: [
    { type: 'h2', text: 'Why Small Businesses Need AI CRM Automation' },
    {
      type: 'p',
      text: 'Small teams can’t afford to miss leads or spend hours on data entry. AI CRM automation captures leads from website chat automatically and can trigger simple workflows—like notifying you when someone requests a quote—so you respond faster and stay organized.',
    },
    { type: 'h2', text: 'Capture Leads From Chat' },
    {
      type: 'p',
      text: 'When visitors chat on your site, the AI can collect their email and details in conversation. Those leads appear in your dashboard with context. Spaxio Assistant also structures quote requests (service, budget, timeline) so you can prioritize without manual triage.',
    },
    { type: 'h2', text: 'Trigger Follow-Ups Automatically' },
    {
      type: 'p',
      text: 'Set up automations that run when a new lead or quote request is captured: send yourself an email, notify your team, or call a webhook to update another tool. That keeps your pipeline in sync without extra work.',
    },
    { type: 'h2', text: 'Start Simple, Scale Later' },
    {
      type: 'p',
      text: 'You don’t need a complex CRM to start. Use Spaxio Assistant’s built-in lead and contact capture, then add automations and optional integrations as you grow. Plans scale from free trials to higher volume and API access.',
    },
  ],
};
