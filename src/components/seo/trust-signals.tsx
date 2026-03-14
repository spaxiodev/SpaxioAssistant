import { Link } from '@/i18n/navigation';

const USE_CASES = [
  { href: '/lead-generation-ai', label: 'Lead generation' },
  { href: '/customer-support-ai', label: 'Customer support' },
  { href: '/ai-crm-automation', label: 'CRM automation' },
  { href: '/website-ai-chatbot', label: 'Website chatbot' },
] as const;

const INDUSTRIES = [
  { href: '/ai-chatbot-for-roofers', label: 'Roofing' },
  { href: '/ai-chatbot-for-law-firms', label: 'Law firms' },
  { href: '/ai-chatbot-for-med-spas', label: 'Med spas' },
] as const;

export function TrustSignals() {
  return (
    <section className="mx-auto mt-24 max-w-5xl" aria-labelledby="trust-heading">
      <h2 id="trust-heading" className="sr-only">
        Use cases and why Spaxio Assistant
      </h2>
      <div className="grid gap-10 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-muted/20 p-6">
          <h3 className="text-lg font-semibold text-foreground">Use cases</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Spaxio Assistant powers AI chatbots and AI agents for lead generation, customer support, CRM automation, and website deployment.
          </p>
          <ul className="mt-4 flex flex-wrap gap-3">
            {USE_CASES.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-muted/20 p-6">
          <h3 className="text-lg font-semibold text-foreground">Why Spaxio vs generic chatbots</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>• Full AI infrastructure: agents, automations, CRM-style capture—not just Q&A.</li>
            <li>• Train on your website and documents so answers stay accurate and on brand.</li>
            <li>• Capture leads and quote requests automatically; trigger workflows when they come in.</li>
            <li>• Deploy on any website with one snippet; scale with multiple agents and API access.</li>
          </ul>
        </div>
      </div>
      <div className="mt-10 rounded-2xl border border-border bg-muted/20 p-6">
        <h3 className="text-lg font-semibold text-foreground">By industry</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          See how businesses in your industry use Spaxio Assistant for AI chatbots and lead capture.
        </p>
        <ul className="mt-4 flex flex-wrap gap-4">
          {INDUSTRIES.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
