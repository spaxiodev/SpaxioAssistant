'use client';

import { motion } from 'framer-motion';
import {
  Globe,
  MessageCircle,
  PackageSearch,
  Search,
  Sparkles,
  UserPlus,
  FileText,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/components/intl-link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
};

function SectionHeading({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto max-w-2xl text-center', className)}>
      <h2 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-3 text-pretty text-base text-muted-foreground sm:text-lg">{subtitle}</p>
      ) : null}
    </div>
  );
}

export function LandingPage() {
  const t = useTranslations('landing');

  const whatCards = [
    { icon: MessageCircle, key: 'answer' as const },
    { icon: UserPlus, key: 'leads' as const },
    { icon: FileText, key: 'quotes' as const },
    { icon: Sparkles, key: 'recommend' as const },
    { icon: Search, key: 'aiSearch' as const },
    { icon: Globe, key: 'languages' as const },
  ];

  const whyKeys = ['faster', 'fewerMissed', 'saveTime', 'experience', 'sales', 'setup'] as const;

  const industryKeys = ['services', 'ecommerce', 'local', 'quotes'] as const;

  const faqKeys = ['coding', 'languages', 'leads', 'quotes', 'recommend', 'search'] as const;

  return (
    <div className="relative isolate overflow-hidden">
      {/* Ambient background */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
      >
        <div className="absolute inset-x-0 top-0 h-[min(70vh,52rem)] bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,hsl(var(--muted)),transparent)]" />
        <div className="absolute right-[-20%] top-32 h-96 w-96 rounded-full bg-primary/[0.04] blur-3xl dark:bg-primary/[0.07]" />
        <div className="absolute left-[-15%] top-64 h-72 w-72 rounded-full bg-sky-500/[0.06] blur-3xl dark:bg-sky-400/[0.05]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:pt-16">
        {/* Hero */}
        <section className="relative">
          <motion.div
            className="mx-auto max-w-3xl text-center"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
              <img src="/icon.png" alt="" className="h-5 w-5 object-contain" aria-hidden />
              <span>{t('hero.badge')}</span>
            </div>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl sm:leading-[1.1] lg:text-6xl">
              {t('hero.headline')}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {t('hero.subheadline')}
            </p>
            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="h-12 rounded-full px-8 text-base shadow-lg shadow-primary/10">
                <Link href="/signup">{t('hero.ctaPrimary')}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-border/80 px-8 text-base">
                <a href="#how-it-works">{t('hero.ctaSecondary')}</a>
              </Button>
            </div>
            <p className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-emerald-500" aria-hidden />
                {t('hero.trust1')}
              </span>
              <span className="hidden sm:inline text-border">·</span>
              <span>{t('hero.trust2')}</span>
              <span className="hidden sm:inline text-border">·</span>
              <span>{t('hero.trust3')}</span>
            </p>
          </motion.div>

          {/* Hero visual — three panels */}
          <motion.div
            className="relative mx-auto mt-14 grid max-w-5xl gap-4 lg:grid-cols-3 lg:gap-5"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] as const }}
          >
            <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/40 p-4 shadow-lg shadow-black/[0.04] ring-1 ring-black/[0.03] dark:shadow-black/30 dark:ring-white/[0.06]">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t('hero.visual.widgetLabel')}
              </p>
              <div className="mt-3 overflow-hidden rounded-lg border border-border/60 bg-background">
                <div className="flex h-7 items-center gap-1.5 border-b border-border/60 bg-muted/40 px-2">
                  <span className="h-2 w-2 rounded-full bg-red-400/90" />
                  <span className="h-2 w-2 rounded-full bg-amber-400/90" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400/90" />
                  <span className="ml-2 truncate text-[10px] text-muted-foreground">
                    {t('hero.visual.widgetUrl')}
                  </span>
                </div>
                <div className="relative h-36 bg-gradient-to-br from-muted/30 to-background p-3">
                  <div className="h-full rounded-md border border-dashed border-border/50 bg-muted/20" />
                  <div className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform group-hover:scale-105">
                    <MessageCircle className="h-5 w-5" aria-hidden />
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/40 p-4 shadow-lg shadow-black/[0.04] ring-1 ring-black/[0.03] dark:shadow-black/30 dark:ring-white/[0.06]">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t('hero.visual.dashboardLabel')}
              </p>
              <div className="mt-3 space-y-2 rounded-lg border border-border/60 bg-background p-3">
                <div className="flex gap-2">
                  <div className="h-16 w-14 shrink-0 rounded-md bg-muted/60" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-2 w-[60%] rounded bg-muted-foreground/15" />
                    <div className="h-2 w-full rounded bg-muted/80" />
                    <div className="h-2 w-4/5 rounded bg-muted/80" />
                  </div>
                </div>
                <div className="space-y-1.5 border-t border-border/50 pt-2">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{t('hero.visual.dashboardRow1')}</span>
                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 dark:text-emerald-400">
                      {t('hero.visual.dashboardStatus')}
                    </span>
                  </div>
                  <div className="h-7 rounded-md bg-primary/8 px-2 text-[10px] leading-7 text-foreground/80">
                    {t('hero.visual.dashboardRow2')}
                  </div>
                  <div className="h-7 rounded-md bg-muted/50 px-2 text-[10px] leading-7 text-muted-foreground">
                    {t('hero.visual.dashboardRow3')}
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/40 p-4 shadow-lg shadow-black/[0.04] ring-1 ring-black/[0.03] dark:shadow-black/30 dark:ring-white/[0.06]">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t('hero.visual.chatLabel')}
              </p>
              <div className="mt-3 space-y-2 rounded-lg border border-border/60 bg-background p-3">
                <div className="flex justify-end">
                  <div className="max-w-[88%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-[11px] leading-snug text-primary-foreground">
                    {t('hero.visual.chatUser')}
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-border/60 bg-muted/40 px-3 py-2 text-[11px] leading-snug text-foreground">
                    {t('hero.visual.chatAssistant')}
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-[11px] leading-snug text-primary-foreground">
                    {t('hero.visual.chatUser2')}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <div className="h-7 flex-1 rounded-lg border border-border/60 bg-muted/30" />
                  <div className="h-7 w-14 shrink-0 rounded-lg bg-primary/90 text-center text-[10px] font-medium leading-7 text-primary-foreground">
                    {t('hero.visual.send')}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* What it does */}
        <section id="features" className="scroll-mt-28 pt-24 sm:pt-28">
          <motion.div {...fadeUp}>
            <SectionHeading title={t('what.title')} subtitle={t('what.subtitle')} />
          </motion.div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {whatCards.map(({ icon: Icon, key }, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-32px' }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="flex flex-col rounded-2xl border border-border/70 bg-card/50 p-5 shadow-sm transition-shadow hover:shadow-md dark:bg-card/30"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 font-semibold text-foreground">{t(`what.cards.${key}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`what.cards.${key}.desc`)}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-28 pt-24 sm:pt-28">
          <motion.div {...fadeUp}>
            <SectionHeading title={t('how.title')} subtitle={t('how.subtitle')} />
          </motion.div>
          <div className="relative mt-14">
            <div className="absolute left-[1.25rem] top-0 hidden h-full w-px bg-gradient-to-b from-border via-primary/25 to-border lg:left-[calc(50%-0.5px)] lg:block" aria-hidden />
            <div className="grid gap-6 lg:grid-cols-4 lg:gap-4">
              {([1, 2, 3, 4] as const).map((n) => (
                <motion.div
                  key={n}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: (n - 1) * 0.06 }}
                  className="relative flex gap-4 lg:flex-col lg:text-center"
                >
                  <div className="flex shrink-0 lg:justify-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary/30 bg-background text-sm font-semibold text-primary shadow-sm">
                      {n}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 rounded-2xl border border-border/70 bg-gradient-to-br from-card/80 to-muted/20 p-5 lg:pt-6">
                    <div className="mb-3 hidden h-24 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 lg:flex">
                      {n === 1 && <Sparkles className="h-10 w-10 text-primary/70" aria-hidden />}
                      {n === 2 && <PackageSearch className="h-10 w-10 text-primary/70" aria-hidden />}
                      {n === 3 && <MessageCircle className="h-10 w-10 text-primary/70" aria-hidden />}
                      {n === 4 && <UserPlus className="h-10 w-10 text-primary/70" aria-hidden />}
                    </div>
                    <h3 className="font-semibold text-foreground">{t(`how.steps.s${n}.title`)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {t(`how.steps.s${n}.desc`)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Simple setup guide */}
        <section className="pt-24 sm:pt-28">
          <motion.div {...fadeUp}>
            <SectionHeading title={t('setupSection.title')} subtitle={t('setupSection.subtitle')} />
          </motion.div>
          <div className="mx-auto mt-12 max-w-3xl">
            <ol className="relative space-y-0 border-l border-border/80 pl-6 sm:pl-8">
              {([1, 2, 3, 4, 5, 6, 7, 8] as const).map((n, i) => (
                <motion.li
                  key={n}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                  className="relative pb-10 last:pb-0"
                >
                  <span className="absolute -left-6 flex h-6 w-6 -translate-x-[calc(50%+1px)] items-center justify-center rounded-full border border-border bg-background text-xs font-semibold text-foreground sm:-left-8">
                    {n}
                  </span>
                  <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-3 sm:px-5 sm:py-4">
                    <h3 className="font-medium text-foreground">{t(`setupSection.steps.s${n}.title`)}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t(`setupSection.steps.s${n}.desc`)}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
            <div className="mt-10 flex justify-center">
              <Button asChild variant="outline" size="lg" className="rounded-full px-6">
                <Link href="/setup-guide">{t('setupSection.fullGuideCta')}</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Why businesses */}
        <section className="pt-24 sm:pt-28">
          <motion.div {...fadeUp}>
            <SectionHeading title={t('why.title')} subtitle={t('why.subtitle')} />
          </motion.div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {whyKeys.map((key, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                className="rounded-2xl border border-border/70 bg-muted/20 p-5 dark:bg-muted/10"
              >
                <h3 className="font-semibold text-foreground">{t(`why.cards.${key}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`why.cards.${key}.desc`)}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Industries */}
        <section className="pt-24 sm:pt-28">
          <motion.div {...fadeUp}>
            <SectionHeading title={t('industries.title')} subtitle={t('industries.subtitle')} />
          </motion.div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {industryKeys.map((key, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
                className="rounded-2xl border border-border/70 bg-gradient-to-br from-card to-muted/15 p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-foreground">{t(`industries.cards.${key}.title`)}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {t(`industries.cards.${key}.desc`)}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="pt-24 sm:pt-28">
          <motion.div {...fadeUp}>
            <SectionHeading title={t('faq.title')} />
          </motion.div>
          <div className="mx-auto mt-10 max-w-3xl space-y-3">
            {faqKeys.map((key) => (
              <details
                key={key}
                className="group rounded-xl border border-border/70 bg-card/40 open:bg-card/60 open:shadow-sm"
              >
                <summary className="cursor-pointer list-none px-5 py-4 font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-3">
                    {t(`faq.items.${key}.q`)}
                    <span className="text-muted-foreground transition group-open:rotate-180">▾</span>
                  </span>
                </summary>
                <div className="border-t border-border/50 px-5 pb-4 pt-0 text-sm leading-relaxed text-muted-foreground">
                  <p className="pt-3">{t(`faq.items.${key}.a`)}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="pt-24 sm:pt-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-primary/[0.07] via-card to-muted/30 px-6 py-14 text-center shadow-xl shadow-black/[0.06] sm:px-12 dark:from-primary/[0.12] dark:shadow-black/40"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/[0.12] blur-3xl" aria-hidden />
            <h2 className="relative text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {t('final.title')}
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-pretty text-muted-foreground sm:text-lg">
              {t('final.subtitle')}
            </p>
            <div className="relative mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="h-12 rounded-full px-8 text-base">
                <Link href="/signup">{t('final.ctaPrimary')}</Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="h-12 rounded-full px-8 text-base">
                <Link href="/pricing">{t('final.ctaSecondary')}</Link>
              </Button>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
