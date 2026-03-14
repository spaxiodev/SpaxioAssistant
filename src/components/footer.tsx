import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

const SPAXIO_BLOG_URL = 'https://www.spaxio.ca/blog';

const SEO_LINKS = [
  { href: '/ai-infrastructure-platform', label: 'AI infrastructure platform' },
  { href: '/ai-chatbot-builder', label: 'AI chatbot builder' },
  { href: '/ai-agents-for-business', label: 'AI agents for business' },
  { href: '/ai-crm-automation', label: 'AI CRM automation' },
  { href: '/website-ai-chatbot', label: 'Website AI chatbot' },
  { href: '/customer-support-ai', label: 'Customer support AI' },
  { href: '/lead-generation-ai', label: 'Lead generation AI' },
] as const;

const INDUSTRY_LINKS = [
  { href: '/ai-chatbot-for-roofers', label: 'AI chatbot for roofers' },
  { href: '/ai-chatbot-for-law-firms', label: 'AI chatbot for law firms' },
  { href: '/ai-chatbot-for-med-spas', label: 'AI chatbot for med spas' },
] as const;

export async function Footer() {
  const t = await getTranslations('footer');
  return (
    <footer className="border-t border-border bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <nav
          className="mb-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm"
          aria-label="Solutions and product"
        >
          {SEO_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/blog"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Blog
          </Link>
        </nav>
        <nav
          className="mb-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm"
          aria-label="By industry"
        >
          {INDUSTRY_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/icon.png" alt="" className="h-6 w-6 shrink-0 object-contain" aria-hidden />
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {t('copyright')}
            </p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <Link
              href="/contact"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t('contact')}
            </Link>
            <a
              href={SPAXIO_BLOG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t('about')}
            </a>
            <Link
              href="/privacy-policy"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t('privacy')}
            </Link>
            <Link
              href="/terms-and-conditions"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t('terms')}
            </Link>
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href="/pricing">{t('pricing')}</Link>
            </Button>
          </nav>
        </div>
      </div>
    </footer>
  );
}
