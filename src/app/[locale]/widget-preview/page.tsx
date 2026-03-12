'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

function WidgetPreviewContent() {
  const searchParams = useSearchParams();
  const widgetId = searchParams.get('widgetId');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!widgetId || !containerRef.current) return;
    const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const script = document.createElement('script');
    script.src = `${base}/widget.js`;
    script.setAttribute('data-widget-id', widgetId);
    script.async = true;
    containerRef.current.appendChild(script);
    return () => {
      script.remove();
    };
  }, [widgetId]);

  return (
    <div ref={containerRef} className="h-full w-full min-h-[400px]" />
  );
}

export default function WidgetPreviewPage() {
  const t = useTranslations('common');
  return (
    <Suspense fallback={<div className="flex h-full min-h-[400px] items-center justify-center">{t('loading')}</div>}>
      <WidgetPreviewContent />
    </Suspense>
  );
}
