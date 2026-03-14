import type { BlogSection } from '@/content/blog/types';

type ArticleBodyProps = { sections: BlogSection[] };

export function ArticleBody({ sections }: ArticleBodyProps) {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      {sections.map((sec, i) => {
        if (sec.type === 'h2')
          return (
            <h2
              key={i}
              id={sec.text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
              className="mt-10 scroll-mt-20 text-2xl font-semibold tracking-tight text-foreground first:mt-0"
            >
              {sec.text}
            </h2>
          );
        if (sec.type === 'h3')
          return (
            <h3
              key={i}
              className="mt-6 text-xl font-semibold tracking-tight text-foreground"
            >
              {sec.text}
            </h3>
          );
        return (
          <p key={i} className="mt-4 text-muted-foreground leading-relaxed">
            {sec.text}
          </p>
        );
      })}
    </article>
  );
}
