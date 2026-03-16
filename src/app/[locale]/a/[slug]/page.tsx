import { AiPageClient } from '@/components/ai-page/ai-page-client';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ handoff?: string }>;
};

export default async function AiPageRoute({ params, searchParams }: Props) {
  const { slug } = await params;
  const { handoff } = await searchParams;

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <AiPageClient slug={slug} handoffToken={handoff ?? undefined} />
    </main>
  );
}
