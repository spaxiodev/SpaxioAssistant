import { AiPageClient } from '@/components/ai-page/ai-page-client';

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ handoff?: string }>;
};

export default async function AiPageByIdRoute({ params, searchParams }: Props) {
  const { id, locale } = await params;
  const { handoff } = await searchParams;

  return (
    <main className="min-h-screen bg-background">
      <AiPageClient pageId={id} locale={locale} handoffToken={handoff ?? undefined} />
    </main>
  );
}
