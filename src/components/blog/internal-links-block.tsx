import { Link } from '@/i18n/navigation';

type LinkItem = { href: string; label: string };

const DEFAULT_LINKS: LinkItem[] = [
  { href: '/', label: 'Home' },
  { href: '/ai-infrastructure-platform', label: 'AI infrastructure platform' },
  { href: '/ai-chatbot-builder', label: 'AI chatbot builder' },
  { href: '/ai-agents-for-business', label: 'AI agents for business' },
  { href: '/ai-crm-automation', label: 'AI CRM automation' },
  { href: '/website-ai-chatbot', label: 'Website AI chatbot' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/signup', label: 'Start free' },
];

type InternalLinksBlockProps = {
  links?: LinkItem[];
};

export function InternalLinksBlock({ links = DEFAULT_LINKS }: InternalLinksBlockProps) {
  return (
    <aside className="mt-12 rounded-2xl border border-border bg-muted/20 p-6" aria-label="Explore">
      <h2 className="text-lg font-semibold text-foreground">Explore</h2>
      <ul className="mt-4 flex flex-wrap gap-3">
        {links.map((item) => (
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
    </aside>
  );
}
