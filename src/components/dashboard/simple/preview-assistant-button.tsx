'use client';

import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

type PreviewAssistantButtonProps = {
  /** When true, show as outline/secondary variant */
  variant?: 'default' | 'outline';
  size?: 'sm' | 'default' | 'lg';
  /** Optional custom class */
  className?: string;
};

/**
 * Reusable "Preview assistant" action that opens the widget preview.
 * Uses existing widget-preview route and install/simple-data for base URL and widget ID.
 */
export function PreviewAssistantButton({ variant = 'outline', size = 'sm', className }: PreviewAssistantButtonProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/install/simple-data')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !data) return;
        const baseUrl = data.baseUrl?.replace(/\/$/, '') ?? '';
        const widgetId = data.widgetId ?? data.agentId;
        const locale = data.widgetLocale ?? 'en';
        const preset = data.widgetPositionPreset ?? 'bottom-right';
        if (baseUrl && widgetId) {
          setPreviewUrl(
            `${baseUrl}/${locale}/widget-preview?widgetId=${encodeURIComponent(widgetId)}&positionPreset=${encodeURIComponent(preset)}`
          );
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!previewUrl) return null;

  return (
    <Button
      variant={variant}
      size={size}
      className={`gap-2 ${className ?? ''}`}
      asChild
    >
      <a href={previewUrl} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="h-4 w-4" />
        Preview assistant
      </a>
    </Button>
  );
}
