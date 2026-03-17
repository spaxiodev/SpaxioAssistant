'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Link } from '@/components/intl-link';
import {
  HELP_ARTICLE_IDS,
  HELP_ARTICLE_CATEGORY,
  type HelpArticleId,
} from './help-articles';
import { Search, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

function matchQuery(text: string, query: string): boolean {
  if (!query.trim()) return true;
  const q = normalize(query);
  const t = normalize(text);
  return t.includes(q) || q.split(/\s+/).every((word) => t.includes(word));
}

export function HelpContentClient() {
  const t = useTranslations('help');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<HelpArticleId | null>('gettingStarted');

  const articlesWithTranslations = useMemo(() => {
    return HELP_ARTICLE_IDS.map((id) => {
      let title = '';
      let body = '';
      try {
        title = t(`articles.${id}.title`);
      } catch {
        title = id;
      }
      try {
        body = t(`articles.${id}.body`);
      } catch {
        body = '';
      }
      const categoryKey = HELP_ARTICLE_CATEGORY[id];
      const categoryLabel = t(`categories.${categoryKey}`);
      return { id, title, body, categoryKey, categoryLabel };
    });
  }, [t]);

  const filtered = useMemo(() => {
    if (!search.trim()) return articlesWithTranslations;
    const q = search.trim();
    return articlesWithTranslations.filter(
      (a) =>
        matchQuery(a.title, q) ||
        matchQuery(a.body, q) ||
        matchQuery(a.categoryLabel, q)
    );
  }, [articlesWithTranslations, search]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <span aria-hidden>←</span>
          {t('backToHome')}
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="mb-2 flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <BookOpen className="h-8 w-8 text-muted-foreground" aria-hidden />
          {t('pageTitle')}
        </h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <div className="relative mb-8">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Search help articles"
          autoFocus
        />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-border bg-muted/30 px-4 py-6 text-center text-muted-foreground">
          {t('noResults')}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((article) => {
            const isExpanded = expandedId === article.id;
            return (
              <li
                key={article.id}
                id={`help-${article.id}`}
                className="rounded-lg border border-border bg-card"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : (article.id as HelpArticleId))
                  }
                  className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                  aria-expanded={isExpanded}
                  aria-controls={`help-${article.id}-body`}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="font-medium">{article.title}</span>
                  <span
                    className={cn(
                      'ml-auto rounded-full px-2 py-0.5 text-xs text-muted-foreground',
                      'bg-muted'
                    )}
                  >
                    {article.categoryLabel}
                  </span>
                </button>
                <div
                  id={`help-${article.id}-body`}
                  role="region"
                  aria-labelledby={`help-${article.id}-title`}
                  hidden={!isExpanded}
                  className={cn(
                    'border-t border-border px-4 py-3',
                    !isExpanded && 'hidden'
                  )}
                >
                  <div
                    id={`help-${article.id}-title`}
                    className="prose prose-sm dark:prose-invert max-w-none text-foreground"
                  >
                    {article.body.split('\n').map((p, i) =>
                      p.trim() ? (
                        <p key={i} className="mb-2 last:mb-0">
                          {p}
                        </p>
                      ) : null
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
        <Link href="/contact" className="underline hover:no-underline">
          {t('contactSupport')}
        </Link>
        {' · '}
        <Link href="/pricing" className="underline hover:no-underline">
          Pricing
        </Link>
      </div>
    </div>
  );
}
