import type { BlogPost } from './types';
import { post as post1 } from './articles/best-ai-chatbot-business-websites';
import { post as post2 } from './articles/what-is-ai-infrastructure-platform';
import { post as post3 } from './articles/how-to-add-ai-chatbot-to-website';
import { post as post4 } from './articles/ai-crm-automation-small-businesses';
import { post as post5 } from './articles/ai-agents-lead-generation';
import { post as post6 } from './articles/ai-customer-support-automation-explained';
import { post as post7 } from './articles/ai-chatbot-vs-ai-agent';
import { post as post8 } from './articles/how-businesses-use-ai-infrastructure-to-scale';

const allPosts: BlogPost[] = [
  post1,
  post2,
  post3,
  post4,
  post5,
  post6,
  post7,
  post8,
];

/** Sorted by date descending for blog index */
export const BLOG_POSTS: BlogPost[] = [...allPosts].sort(
  (a, b) => new Date(b.meta.date).getTime() - new Date(a.meta.date).getTime()
);
