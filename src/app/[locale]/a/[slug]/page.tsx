import { AiPageClient } from '@/components/ai-page/ai-page-client';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ handoff?: string; lang?: string }>;
};

export default async function AiPageRoute({ params, searchParams }: Props) {
  const { slug, locale } = await params;
  const { handoff, lang } = await searchParams;

  return (
    <main className="min-h-screen bg-background">
      <AiPageClient slug={slug} locale={locale} langOverride={lang ?? undefined} handoffToken={handoff ?? undefined} />
    </main>
  );
}
