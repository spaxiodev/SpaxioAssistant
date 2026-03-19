import { AiPageClient } from '@/components/ai-page/ai-page-client';

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ handoff?: string; lang?: string }>;
};

export default async function AiPageByIdRoute({ params, searchParams }: Props) {
  const { id, locale } = await params;
  const { handoff, lang } = await searchParams;

  return (
    <main className="min-h-screen bg-background">
      <AiPageClient pageId={id} locale={locale} langOverride={lang ?? undefined} handoffToken={handoff ?? undefined} />
    </main>
  );
}
