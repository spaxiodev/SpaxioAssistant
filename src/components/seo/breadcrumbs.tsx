import { Link } from '@/i18n/navigation';
import { JsonLd } from './json-ld';
import { buildBreadcrumbSchema, type BreadcrumbItem } from '@/lib/seo-schema';

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  locale: string;
  className?: string;
};

export function Breadcrumbs({ items, locale, className = '' }: BreadcrumbsProps) {
  const schema = buildBreadcrumbSchema(items, locale);

  return (
    <>
      <JsonLd id="breadcrumb-schema" data={schema} />
      <nav aria-label="Breadcrumb" className={className}>
        <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden>/</span>}
              {i === items.length - 1 ? (
                <span className="text-foreground">{item.name}</span>
              ) : (
                <Link
                  href={item.path || '/'}
                  className="transition-colors hover:text-foreground"
                >
                  {item.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
