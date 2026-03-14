import type { BlogPost } from '../types';

export const post: BlogPost = {
  meta: {
    slug: 'ai-agents-lead-generation',
    title: 'AI Agents for Lead Generation',
    description:
      'Use AI agents to generate and qualify leads from your website. Capture contact details and intent in conversation, then trigger follow-up workflows.',
    date: '2025-03-05',
    readTimeMinutes: 5,
    author: 'Spaxio',
    category: 'Lead Generation',
    tags: ['AI agents', 'lead generation', 'qualification'],
    relatedSlugs: [
      'lead-generation-ai',
      'ai-agents-for-business',
      'best-ai-chatbot-for-business-websites',
    ],
  },
  sections: [
    { type: 'h2', text: 'How AI Agents Support Lead Generation' },
    {
      type: 'p',
      text: 'AI agents can engage visitors in conversation, answer questions, and capture contact details and intent when the time is right. Unlike static forms, they qualify through dialogue and hand off warm leads to your team with full context.',
    },
    { type: 'h2', text: 'Capture and Qualify in One Flow' },
    {
      type: 'p',
      text: 'Spaxio Assistant’s AI agents capture email, phone, and other details from natural conversation. Quote requests are structured (service, budget, timeline) so you see who’s ready to buy. That reduces manual qualification and helps sales focus on the best prospects.',
    },
    { type: 'h2', text: 'Trigger Workflows When Leads Come In' },
    {
      type: 'p',
      text: 'When a lead is captured, you can trigger automations: notify your team, send a follow-up, or push data to your CRM via webhook. So every lead gets a timely, consistent response without manual steps.',
    },
  ],
};
