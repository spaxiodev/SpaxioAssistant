import { getTranslations } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  return (
    <div className="relative isolate overflow-hidden px-4 pb-24 pt-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top,hsl(var(--muted)),transparent_50%)]" />
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <img src="/icon.png" alt="" className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16" aria-hidden />
          <h1 className="mt-4 text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
            {t('title')}
          </h1>
          <div className="mt-6 rounded-full border border-border bg-white/80 px-4 py-1 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur dark:bg-card/80">
            {t('tagline')}
          </div>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
            {t('description')}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link href="/signup">{t('getStarted')}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-7">
              <Link href="/login">{t('logIn')}</Link>
            </Button>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t('browseNoAccount')}
          </p>
        </div>

        <div className="mx-auto mt-16 flex max-w-5xl flex-wrap justify-center gap-3 text-sm text-muted-foreground">
          <span className="rounded-full bg-background/75 px-4 py-2 shadow-sm backdrop-blur">
            {t('customWidgetBranding')}
          </span>
          <span className="rounded-full bg-background/75 px-4 py-2 shadow-sm backdrop-blur">
            {t('leadCapture')}
          </span>
          <span className="rounded-full bg-background/75 px-4 py-2 shadow-sm backdrop-blur">
            {t('quoteRequests')}
          </span>
          <span className="rounded-full bg-background/75 px-4 py-2 shadow-sm backdrop-blur">
            {t('themeToggle')}
          </span>
        </div>
      </div>
    </div>
  );
}
