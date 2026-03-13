import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

const SPAXIO_BLOG_URL = 'https://www.spaxio.ca/blog';

export async function Footer() {
  const t = await getTranslations('footer');
  return (
    <footer className="border-t border-border bg-muted/30 px-4 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2">
          <img src="/icon.png" alt="" className="h-6 w-6 shrink-0 object-contain" aria-hidden />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {t('copyright')}
          </p>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
          <Link
            href="/#contact"
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
            <Link href="/dashboard/billing">{t('pricing')}</Link>
          </Button>
        </nav>
      </div>
    </footer>
  );
}
