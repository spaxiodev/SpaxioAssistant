/**
 * Programmatic SEO: use-case pages under /[locale]/ai/[use-case].
 * Add new entries here to get new statically generated SEO pages and sitemap entries.
 */

export type UseCase = {
  slug: string;
  title: string;
  description: string;
  headline: string;
  body: string;
  benefits: { title: string; body: string }[];
  keywords: string[];
};

export const AI_USE_CASES: UseCase[] = [
  {
    slug: 'ai-chatbot-for-electricians',
    title: 'AI Chatbot for Electricians',
    description:
      'Deploy an AI chatbot for your electrical business. Answer FAQs, collect service requests, and qualify leads 24/7. Spaxio Assistant powers AI chatbots for electricians.',
    headline: 'AI Chatbot for Electricians — Qualify Leads & Book Jobs Around the Clock',
    body: 'Electricians waste time on the phone answering the same questions. An AI chatbot for electricians handles after-hours inquiries, explains your services and pricing, and captures contact info so you follow up with hot leads. Spaxio Assistant lets you train an AI on your services, areas served, and FAQs, then embed it on your website with one script. No coding required.',
    benefits: [
      {
        title: '24/7 availability',
        body: 'Visitors get instant answers about rates, service areas, and emergency availability even when your office is closed.',
      },
      {
        title: 'Qualified lead capture',
        body: 'Collect name, phone, and project details in chat so you only call back leads that are ready to book.',
      },
      {
        title: 'Fewer missed calls',
        body: 'Turn after-hours and weekend traffic into leads instead of lost voicemails.',
      },
    ],
    keywords: ['AI chatbot for electricians', 'electrician chatbot', 'HVAC lead capture', 'contractor AI'],
  },
  {
    slug: 'ai-chatbot-for-landscaping',
    title: 'AI Chatbot for Landscaping',
    description:
      'AI chatbot for landscaping companies. Engage visitors, explain services and seasonal offers, and capture leads for quotes. Spaxio Assistant helps landscapers automate first contact.',
    headline: 'AI Chatbot for Landscaping — Engage Visitors and Capture Quote Requests',
    body: 'Landscaping leads often browse at night or on weekends. An AI chatbot for landscaping answers questions about your services, seasonal packages, and pricing, and collects contact details for estimates. Spaxio Assistant gives you a custom AI trained on your offerings so every conversation stays on-brand and converts.',
    benefits: [
      {
        title: 'Service and pricing answers',
        body: 'Let the AI explain mowing, mulching, design, and maintenance so you spend less time on repetitive calls.',
      },
      {
        title: 'Quote request intake',
        body: 'Capture property size, address, and project type in chat so your team can send accurate estimates.',
      },
      {
        title: 'Seasonal and local focus',
        body: 'Train the AI on your service area and seasonal promotions so answers are always relevant.',
      },
    ],
    keywords: ['AI chatbot for landscaping', 'landscaping chatbot', 'lawn care lead capture', 'landscape AI'],
  },
  {
    slug: 'ai-chatbot-for-web-design',
    title: 'AI Chatbot for Web Design',
    description:
      'AI chatbot for web design agencies and freelancers. Qualify project inquiries, show portfolios, and book discovery calls. Spaxio Assistant helps web designers capture more leads.',
    headline: 'AI Chatbot for Web Design — Qualify Inquiries and Book Discovery Calls',
    body: 'Web design leads want to know your process, timeline, and ballpark cost before they book a call. An AI chatbot for web design can answer FAQs, link to your portfolio, and collect project details so you only get on calls with serious prospects. Spaxio Assistant powers custom AI chatbots that match your brand and messaging.',
    benefits: [
      {
        title: 'Qualify before the call',
        body: 'Gather project type, budget range, and timeline in chat so every discovery call is worth your time.',
      },
      {
        title: 'Portfolio and process',
        body: 'The AI can explain your process, link to case studies, and set expectations so clients arrive prepared.',
      },
      {
        title: 'Booking and intake',
        body: 'Connect chat to your calendar or CRM so qualified leads become scheduled calls automatically.',
      },
    ],
    keywords: ['AI chatbot for web design', 'web design chatbot', 'agency lead capture', 'freelancer AI'],
  },
  {
    slug: 'ai-lead-generation-for-small-business',
    title: 'AI Lead Generation for Small Business',
    description:
      'AI lead generation for small business: capture leads 24/7 with a website chatbot. Qualify visitors, collect contact info, and automate follow-up. Spaxio Assistant makes AI lead capture simple.',
    headline: 'AI Lead Generation for Small Business — Capture Leads Without a Big Team',
    body: 'Small businesses can’t afford to miss leads when the office is closed. AI lead generation captures visitor questions and contact details around the clock. Spaxio Assistant gives you an AI chatbot that learns your services and FAQs, so every conversation qualifies and nurtures leads until you’re ready to follow up.',
    benefits: [
      {
        title: 'Always-on capture',
        body: 'Turn night and weekend traffic into leads instead of bounce visits.',
      },
      {
        title: 'Qualification in chat',
        body: 'Ask a few questions in chat so you only follow up with leads that fit your ideal customer.',
      },
      {
        title: 'No extra headcount',
        body: 'One AI handles first contact so you and your team focus on closing, not answering the same questions.',
      },
    ],
    keywords: ['AI lead generation for small business', 'small business lead capture', 'AI chatbot lead generation', 'website lead capture'],
  },
  {
    slug: 'ai-quote-generator-for-contractors',
    title: 'AI Quote Generator for Contractors',
    description:
      'AI quote generator for contractors: let visitors get instant estimates and submit quote requests via an AI chatbot. Spaxio Assistant powers AI-driven quote intake for contractors.',
    headline: 'AI Quote Generator for Contractors — Instant Estimates and Quote Requests',
    body: 'Contractors lose jobs when leads have to wait for a callback to get a ballpark price. An AI quote generator for contractors can ask a few questions (project type, size, location) and either give a range or collect details for a formal quote. Spaxio Assistant lets you build an AI that knows your pricing logic and captures structured quote requests 24/7.',
    benefits: [
      {
        title: 'Faster first response',
        body: 'Visitors get an instant ballpark or quote request form in chat, so you don’t lose them to competitors.',
      },
      {
        title: 'Structured quote requests',
        body: 'Collect project details in a consistent format so your team can send accurate quotes faster.',
      },
      {
        title: 'Integration with your workflow',
        body: 'Send quote requests to your CRM or email so nothing falls through the cracks.',
      },
    ],
    keywords: ['AI quote generator for contractors', 'contractor quote bot', 'instant quote AI', 'construction lead capture'],
  },
  {
    slug: 'ai-chatbot-for-website',
    title: 'AI Chatbot for Website',
    description:
      'Add an AI chatbot to your website in minutes. Custom answers, lead capture, and 24/7 availability. Spaxio Assistant is the AI chatbot for website owners who want more leads and less busywork.',
    headline: 'AI Chatbot for Website — Custom AI That Answers, Qualifies, and Converts',
    body: 'An AI chatbot for your website can answer visitor questions, explain your products or services, and capture leads without you being online. Spaxio Assistant lets you train an AI on your content and deploy it as a widget or full-page experience. One script, no coding—just add it to your site and start capturing more leads.',
    benefits: [
      {
        title: 'Trained on your content',
        body: 'The AI learns your FAQs, services, and pricing so every answer is accurate and on-brand.',
      },
      {
        title: 'Widget or full-page',
        body: 'Embed a small chat widget or create a dedicated AI page for quotes, support, or intake.',
      },
      {
        title: 'Leads and automation',
        body: 'Capture contacts in chat and trigger follow-up emails or CRM updates automatically.',
      },
    ],
    keywords: ['AI chatbot for website', 'website chatbot', 'AI chat widget', 'custom AI chatbot'],
  },
];

export function getUseCaseBySlug(slug: string): UseCase | undefined {
  return AI_USE_CASES.find((u) => u.slug === slug);
}

export function getAllUseCaseSlugs(): string[] {
  return AI_USE_CASES.map((u) => u.slug);
}
