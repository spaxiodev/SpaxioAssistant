import type { BlogPost } from '../types';

export const post: BlogPost = {
  meta: {
    slug: 'ai-customer-support-automation-explained',
    title: 'AI Customer Support Automation Explained',
    description:
      'How AI automates customer support: answer FAQs from your knowledge base, capture tickets when escalation is needed, and trigger follow-up workflows.',
    date: '2025-03-06',
    readTimeMinutes: 5,
    author: 'Spaxio',
    category: 'Support',
    tags: ['customer support', 'AI', 'automation'],
    relatedSlugs: [
      'customer-support-ai',
      'ai-chatbot-vs-ai-agent',
      'how-businesses-use-ai-infrastructure-to-scale',
    ],
  },
  sections: [
    { type: 'h2', text: 'What Is AI Customer Support Automation?' },
    {
      type: 'p',
      text: 'AI customer support automation uses an AI assistant to answer common questions from your knowledge base and to collect context when a human is needed. It can also trigger workflows—e.g. create a ticket or notify support—so handoffs are smooth and nothing is lost.',
    },
    { type: 'h2', text: 'Answer FAQs 24/7' },
    {
      type: 'p',
      text: 'Train the AI on your help docs, FAQs, and website. It answers shipping, returns, pricing, and other repetitive questions instantly, so your team can focus on complex or sensitive issues.',
    },
    { type: 'h2', text: 'Escalate With Context' },
    {
      type: 'p',
      text: 'When the AI can’t resolve an issue, it can capture the visitor’s name, email, and a summary of the problem. That information can create a ticket or notify your team with full conversation history for a smooth handoff.',
    },
    { type: 'h2', text: 'Scale Without Proportional Headcount' },
    {
      type: 'p',
      text: 'As volume grows, the same AI handles more conversations. Spaxio Assistant scales with your message volume and number of agents, so you can grow support capacity without adding staff for every peak.',
    },
  ],
};
