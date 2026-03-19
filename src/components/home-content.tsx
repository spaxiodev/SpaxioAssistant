import { getTranslations } from 'next-intl/server';
import { Link } from '@/components/intl-link';
import { Button } from '@/components/ui/button';
import { HomeDemoSection } from '@/components/home-demo-section';

export async function HomeContent() {
  const t = await getTranslations('home');
  return (
    <div className="relative isolate overflow-hidden px-4 pb-24 pt-12 sm:pt-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top,hsl(var(--muted)),transparent_50%)]" />
      <div className="mx-auto max-w-5xl">
        {/* Hero - outcome-focused */}
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <img
            src="/icon.png"
            alt=""
            className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16"
            aria-hidden
          />
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            {t('heroTitle')}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
            {t('heroSubtitle')}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link href="/signup">{t('ctaPrimary')}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-7">
              <Link href="/demo/ai-chat">{t('ctaSecondary')}</Link>
            </Button>
            <Link
              href="/pricing"
              className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t('ctaPricing')}
            </Link>
          </div>
        </div>

        {/* Feature pills */}
        <div className="mx-auto mt-12 flex max-w-4xl flex-wrap justify-center gap-3 text-sm text-muted-foreground">
          <span className="rounded-full bg-background/75 px-4 py-2 shadow-sm backdrop-blur">
            {t('leadCapture')}
          </span>
          <span className="rounded-full bg-background/75 px-4 py-2 shadow-sm backdrop-blur">
            {t('quoteRequests')}
          </span>
          <span className="rounded-full bg-background/75 px-4 py-2 shadow-sm backdrop-blur">
            {t('customWidgetBranding')}
          </span>
          <span className="rounded-full bg-background/75 px-4 py-2 shadow-sm backdrop-blur">
            {t('themeToggle')}
          </span>
        </div>

        {/* How it works */}
        <section
          className="mx-auto mt-20 max-w-4xl"
          aria-labelledby="how-it-works"
        >
          <h2
            id="how-it-works"
            className="text-center text-2xl font-semibold text-foreground sm:text-3xl"
          >
            {t('howItWorksTitle')}
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border/60 bg-card/50 p-6 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary mx-auto">
                1
              </span>
              <h3 className="mt-4 font-semibold text-foreground">
                {t('howStep1')}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('howStep1Desc')}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/50 p-6 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary mx-auto">
                2
              </span>
              <h3 className="mt-4 font-semibold text-foreground">
                {t('howStep2')}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('howStep2Desc')}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/50 p-6 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary mx-auto">
                3
              </span>
              <h3 className="mt-4 font-semibold text-foreground">
                {t('howStep3')}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('howStep3Desc')}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/50 p-6 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary mx-auto">
                4
              </span>
              <h3 className="mt-4 font-semibold text-foreground">
                {t('howStep4')}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('howStep4Desc')}
              </p>
            </div>
          </div>
        </section>

        {/* Demo section */}
        <section
          className="mx-auto mt-24 max-w-4xl"
          aria-labelledby="demo-section"
        >
          <h2 id="demo-section" className="text-center text-2xl font-semibold text-foreground sm:text-3xl">
            {t('demoTitle')}
          </h2>
          <p className="mt-3 text-center text-muted-foreground">
            {t('demoDescription')}
          </p>
          <div className="mt-8 flex justify-center">
            <HomeDemoSection />
          </div>
          <div className="mt-6 flex justify-center">
            <Button asChild variant="outline" size="lg" className="rounded-full px-6">
              <Link href="/demo/ai-chat">{t('demoCta')}</Link>
            </Button>
          </div>
        </section>

        {/* Use cases */}
        <section
          className="mx-auto mt-24 max-w-4xl"
          aria-labelledby="use-cases"
        >
          <h2
            id="use-cases"
            className="text-center text-2xl font-semibold text-foreground sm:text-3xl"
          >
            {t('useCasesTitle')}
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-card/30 p-5">
              <h3 className="font-semibold text-foreground">{t('useCase1')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('useCase1Desc')}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/30 p-5">
              <h3 className="font-semibold text-foreground">{t('useCase2')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('useCase2Desc')}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/30 p-5">
              <h3 className="font-semibold text-foreground">{t('useCase3')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('useCase3Desc')}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/30 p-5">
              <h3 className="font-semibold text-foreground">{t('useCase4')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('useCase4Desc')}
              </p>
            </div>
          </div>
        </section>

        {/* Trust */}
        <section
          className="mx-auto mt-24 max-w-4xl"
          aria-labelledby="trust-section"
        >
          <h2
            id="trust-section"
            className="text-center text-2xl font-semibold text-foreground sm:text-3xl"
          >
            {t('trustTitle')}
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <h3 className="font-semibold text-foreground">{t('trust1')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('trust1Desc')}
              </p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-foreground">{t('trust2')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('trust2Desc')}
              </p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-foreground">{t('trust3')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('trust3Desc')}
              </p>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-foreground">{t('trust4')}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('trust4Desc')}
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <div className="mx-auto mt-24 flex max-w-2xl flex-col items-center rounded-2xl border border-border/60 bg-card/30 px-6 py-12 text-center">
          <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
            {t('seoSectionTitle')}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {t('seoSectionBody')}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link href="/signup">{t('ctaPrimary')}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-7">
              <Link href="/login">{t('logIn')}</Link>
            </Button>
          </div>
        </div>

        {/* Footer nav - simplified */}
        <nav
          className="mx-auto mt-16 max-w-2xl border-t border-border pt-10 text-center"
          aria-label="Product and resources"
        >
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link
              href="/pricing"
              className="hover:text-foreground underline-offset-4 hover:underline"
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              className="hover:text-foreground underline-offset-4 hover:underline"
            >
              Contact
            </Link>
            <Link
              href="/demo/ai-chat"
              className="hover:text-foreground underline-offset-4 hover:underline"
            >
              Demo
            </Link>
            <Link
              href="/help"
              className="hover:text-foreground underline-offset-4 hover:underline"
            >
              Help
            </Link>
          </div>
        </nav>
      </div>
    </div>
  );
}
