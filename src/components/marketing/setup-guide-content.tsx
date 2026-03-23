'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Link } from '@/components/intl-link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const sectionKeys = [
  'business',
  'behavior',
  'leads',
  'quotes',
  'recommendations',
  'aiSearch',
  'install',
  'notifications',
  'testing',
] as const;

const fade = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-24px' },
  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
};

export function SetupGuideContent() {
  const t = useTranslations('setupGuide');

  return (
    <div className="relative isolate overflow-hidden px-4 pb-24 pt-10 sm:pt-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[22rem] bg-[radial-gradient(ellipse_at_top,hsl(var(--muted)),transparent_65%)]" />
      <div className="mx-auto max-w-3xl">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-6 gap-1.5 text-muted-foreground hover:text-foreground">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {t('back')}
          </Link>
        </Button>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t('title')}
          </h1>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">{t('intro')}</p>
        </motion.div>

        <div className="mt-14 space-y-10">
          {sectionKeys.map((key, i) => (
            <motion.article
              key={key}
              {...fade}
              transition={{ duration: 0.4, delay: i * 0.03 }}
              className="rounded-2xl border border-border/70 bg-card/50 p-6 shadow-sm dark:bg-card/30 sm:p-8"
            >
              <h2 className="text-xl font-semibold text-foreground">{t(`sections.${key}.heading`)}</h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                <p>
                  <span className="font-medium text-foreground">{t('labels.what')}</span> {t(`sections.${key}.what`)}
                </p>
                <p>
                  <span className="font-medium text-foreground">{t('labels.why')}</span> {t(`sections.${key}.why`)}
                </p>
                <p>
                  <span className="font-medium text-foreground">{t('labels.fill')}</span> {t(`sections.${key}.fill`)}
                </p>
              </div>
            </motion.article>
          ))}
        </div>

        <motion.div
          className="mt-14 rounded-2xl border border-border/80 bg-muted/25 px-6 py-8 text-center dark:bg-muted/10"
          {...fade}
        >
          <p className="text-sm text-muted-foreground">{t('footerHint')}</p>
          <Button asChild className="mt-4 rounded-full px-6">
            <Link href="/signup">{t('cta')}</Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
