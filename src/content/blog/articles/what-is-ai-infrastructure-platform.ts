import type { BlogPost } from '../types';

export const post: BlogPost = {
  meta: {
    slug: 'what-is-ai-infrastructure-platform',
    title: 'What Is an AI Infrastructure Platform?',
    description:
      'An AI infrastructure platform gives businesses the building blocks to build, deploy, and manage AI applications—chatbots, agents, and automations—in one place.',
    date: '2025-03-02',
    readTimeMinutes: 5,
    author: 'Spaxio',
    category: 'AI Infrastructure',
    tags: ['AI infrastructure', 'platform', 'business'],
    relatedSlugs: [
      'how-businesses-use-ai-infrastructure-to-scale',
      'ai-chatbot-vs-ai-agent',
      'ai-crm-automation-small-businesses',
    ],
  },
  sections: [
    { type: 'h2', text: 'Definition of an AI Infrastructure Platform' },
    {
      type: 'p',
      text: 'An AI infrastructure platform is a system that lets businesses create, deploy, and manage AI-powered applications in one place. Instead of building separate tools for chat, automation, and CRM, you get a unified layer: AI agents that can converse and take action, knowledge bases trained on your content, and deployment to your website or API.',
    },
    { type: 'h2', text: 'What It Includes' },
    {
      type: 'p',
      text: 'Typically, an AI infrastructure platform includes: custom AI agents or chatbots you can train and configure; knowledge management (e.g. connecting your website and documents); automation and workflow triggers; and flexible deployment (widget, embed, API). Spaxio Assistant is built as such a platform—you get agents, knowledge, CRM-style lead capture, automations, and deployment in one product.',
    },
    { type: 'h2', text: 'Why Businesses Use One' },
    {
      type: 'p',
      text: 'Using one AI infrastructure platform reduces integration work and keeps your AI layer consistent. You can run a website chatbot, automate lead and CRM workflows, and add more agents or use cases over time without switching vendors. That makes it easier to scale AI across support, sales, and operations.',
    },
  ],
};
