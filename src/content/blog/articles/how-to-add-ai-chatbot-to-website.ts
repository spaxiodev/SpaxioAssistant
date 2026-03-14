import type { BlogPost } from '../types';

export const post: BlogPost = {
  meta: {
    slug: 'how-to-add-ai-chatbot-to-website',
    title: 'How to Add an AI Chatbot to Your Website',
    description:
      'Step-by-step guide to adding an AI chatbot to your website: sign up, train on your content, customize, and paste the install code. Works on any site.',
    date: '2025-03-03',
    readTimeMinutes: 5,
    author: 'Spaxio',
    category: 'AI Chatbot',
    tags: ['AI chatbot', 'website', 'install', 'tutorial'],
    relatedSlugs: [
      'best-ai-chatbot-for-business-websites',
      'website-ai-chatbot',
      'ai-chatbot-builder',
    ],
  },
  sections: [
    { type: 'h2', text: 'Step 1: Choose a Platform' },
    {
      type: 'p',
      text: 'Pick an AI chatbot platform that lets you train the bot on your content and embed it on your site. Spaxio Assistant gives you custom agents, knowledge sources, and a one-snippet install—no coding required.',
    },
    { type: 'h2', text: 'Step 2: Add Your Knowledge' },
    {
      type: 'p',
      text: 'Connect your website and any documents or FAQs. The AI will use this content to answer visitor questions accurately. You can add or update sources anytime from your dashboard.',
    },
    { type: 'h2', text: 'Step 3: Customize Look and Behavior' },
    {
      type: 'p',
      text: 'Set your brand colors, widget position (e.g. bottom-right), and welcome message. Configure how the chatbot handles lead capture and quote requests so it fits your sales process.',
    },
    { type: 'h2', text: 'Step 4: Install on Your Site' },
    {
      type: 'p',
      text: 'Copy the install code from your dashboard and paste it just before the closing </body> tag on your website. The chatbot works on WordPress, Shopify, Wix, and custom HTML. It loads asynchronously and won’t slow down your page.',
    },
  ],
};
