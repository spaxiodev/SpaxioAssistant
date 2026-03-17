import { AiPageClient } from '@/components/ai-page/ai-page-client';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ handoff?: string }>;
};

export default async function AiPageRoute({ params, searchParams }: Props) {
  const { slug, locale } = await params;
  const { handoff } = await searchParams;

  return (
    <main className="min-h-screen bg-background">
      <AiPageClient slug={slug} locale={locale} handoffToken={handoff ?? undefined} />
    </main>
  );
}
