import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
      <p className="text-muted-foreground">{t('description')}</p>
      <Button asChild>
        <Link href="/">{t('goHome')}</Link>
      </Button>
    </div>
  );
}
