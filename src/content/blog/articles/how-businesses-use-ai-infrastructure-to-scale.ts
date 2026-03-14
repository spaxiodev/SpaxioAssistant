import type { BlogPost } from '../types';

export const post: BlogPost = {
  meta: {
    slug: 'how-businesses-use-ai-infrastructure-to-scale',
    title: 'How Businesses Use AI Infrastructure to Scale',
    description:
      'From a single website chatbot to multiple agents and automations: how companies use an AI infrastructure platform to scale support, sales, and operations.',
    date: '2025-03-08',
    readTimeMinutes: 6,
    author: 'Spaxio',
    category: 'AI Infrastructure',
    tags: ['AI infrastructure', 'scale', 'business'],
    relatedSlugs: [
      'what-is-ai-infrastructure-platform',
      'ai-business-automation',
      'ai-crm-automation',
    ],
  },
  sections: [
    { type: 'h2', text: 'Start With One Use Case' },
    {
      type: 'p',
      text: 'Most businesses start with a single AI chatbot on their website—answering questions and capturing leads. An AI infrastructure platform like Spaxio Assistant lets you add knowledge sources, customize behavior, and go live in minutes. That one use case often proves value before you expand.',
    },
    { type: 'h2', text: 'Add Automations and Multiple Agents' },
    {
      type: 'p',
      text: 'Once leads flow in, add automations: notify your team, send follow-ups, or push data to other tools. As you grow, you can add more AI agents—e.g. one for support, one for sales—and deploy them on different pages or via API. The platform scales with your needs.',
    },
    { type: 'h2', text: 'Connect to Your Stack' },
    {
      type: 'p',
      text: 'Use webhooks and (where available) native integrations to connect your AI layer to your CRM, help desk, and internal systems. That way every conversation can drive a workflow, and your AI infrastructure becomes a central part of how you operate.',
    },
    { type: 'h2', text: 'Scale Without Switching Vendors' },
    {
      type: 'p',
      text: 'A single AI infrastructure platform means one place to train, deploy, and manage. You can scale message volume, agents, and automations without migrating to a new product. Spaxio Assistant offers plans from free trials to enterprise so you can grow in place.',
    },
  ],
};
