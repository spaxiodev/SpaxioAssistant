'use client';

import { useRef, useState, useTransition } from 'react';
import { Label } from '@/components/ui/label';
import { Monitor, Smartphone } from 'lucide-react';

type Props = {
  widgetId: string;
  baseUrl: string;
  locale: string;
  initialPreset: string;
};

const PRESET_OPTIONS = [
  { value: 'bottom-right', label: 'Bottom right (recommended)' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-center', label: 'Bottom center' },
  { value: 'top-right', label: 'Top right' },
  { value: 'top-left', label: 'Top left' },
  { value: 'top-center', label: 'Top center' },
  { value: 'middle-right', label: 'Middle right' },
  { value: 'middle-left', label: 'Middle left' },
  { value: 'middle-center', label: 'Middle center' },
];

type ViewMode = 'desktop' | 'mobile';

export function WidgetPreviewWithPreset({ widgetId, baseUrl, locale, initialPreset }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [preset, setPreset] = useState(initialPreset || 'bottom-right');
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [previewNonce, setPreviewNonce] = useState(0);

  const onChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    const nextPreset = e.target.value;
    setPreset(nextPreset);
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch('/api/settings/widget-position-preset', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            preset: nextPreset,
          }),
        });
        if (!res.ok) {
          console.error('Failed to save widget position preset', res.status);
          setError('Failed to save widget position. Try again.');
          return;
        }
        setPreviewNonce((n) => n + 1);
      } catch {
        // ignore, keep last known good preset in UI
      }
    });
  };

  const previewUrl = `${baseUrl}/${locale}/widget-preview?widgetId=${encodeURIComponent(widgetId)}&positionPreset=${encodeURIComponent(preset)}&preview=${previewNonce}`;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="installWidgetPosition">Widget position</Label>
        <select
          id="installWidgetPosition"
          value={preset}
          onChange={onChange}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          disabled={!widgetId || isPending}
        >
          {PRESET_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">
          Controls where the chat bubble appears on your site on desktop. Mobile still uses a bottom sheet.
        </p>
      </div>

      {/* View mode switcher */}
      <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
        <button
          type="button"
          onClick={() => setViewMode('desktop')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            viewMode === 'desktop'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Monitor className="h-4 w-4" />
          Desktop
        </button>
        <button
          type="button"
          onClick={() => setViewMode('mobile')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            viewMode === 'mobile'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Smartphone className="h-4 w-4" />
          Mobile
        </button>
      </div>

      {/* Preview stage */}
      <div
        className="relative flex min-h-[420px] items-center justify-center rounded-2xl border border-border/50 bg-gradient-to-b from-muted/30 to-muted/10 p-6 shadow-inner"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, hsl(var(--muted) / 0.15) 0%, transparent 70%)`,
        }}
      >
        {viewMode === 'desktop' ? (
          /* Desktop frame: browser-style viewport */
          <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border/60 bg-background shadow-xl">
            <div className="flex items-center gap-2 border-b border-border/40 bg-muted/30 px-4 py-2.5">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="ml-4 flex-1 rounded-md bg-muted/50 px-3 py-1.5 text-center text-xs text-muted-foreground">
                your-site.com
              </div>
            </div>
            <div className="relative flex-1 min-h-[360px] bg-muted/20">
              <iframe
                ref={iframeRef}
                title="Widget preview (desktop)"
                src={previewUrl}
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
          </div>
        ) : (
          /* Mobile frame: phone mockup */
          <div className="flex flex-col items-center">
            <div className="rounded-[2.25rem] border-[10px] border-border bg-border p-1 shadow-2xl">
              <div className="overflow-hidden rounded-[1.5rem] bg-background">
                <div className="h-6 w-full bg-muted/50" />
                <div className="relative h-[420px] w-[375px]">
                  <iframe
                    ref={iframeRef}
                    title="Widget preview (mobile)"
                    src={previewUrl}
                    className="h-full w-full border-0"
                  />
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">375 × 812 viewport</p>
          </div>
        )}
      </div>
    </div>
  );
}
