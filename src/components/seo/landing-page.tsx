import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export type SeoLandingProps = {
  title: string;
  description: string;
  features: { title: string; body: string }[];
};

export function SeoLandingPage({ title, description, features }: SeoLandingProps) {
  return (
    <div className="relative isolate overflow-hidden px-4 pb-24 pt-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_top,hsl(var(--muted)),transparent_50%)]" />
      <div className="mx-auto max-w-3xl">
        <p className="mb-6">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
            ← Back to home
          </Link>
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          {description}
        </p>
        <div className="mt-10">
          <Button asChild size="lg" className="rounded-full px-7">
            <Link href="/signup">Get started free</Link>
          </Button>
        </div>

        <section className="mt-16 space-y-10" aria-labelledby="features-heading">
          <h2 id="features-heading" className="text-2xl font-semibold text-foreground">
            Why use Spaxio Assistant
          </h2>
          <ul className="space-y-8">
            {features.map((f, i) => (
              <li key={i}>
                <h3 className="text-lg font-medium text-foreground">{f.title}</h3>
                <p className="mt-2 text-muted-foreground">{f.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-16 flex flex-wrap items-center gap-4 border-t border-border pt-10">
          <Button asChild size="lg" className="rounded-full px-7">
            <Link href="/signup">Create account</Link>
          </Button>
          <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
            View pricing
          </Link>
          <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
            Contact us
          </Link>
        </div>
      </div>
    </div>
  );
}
