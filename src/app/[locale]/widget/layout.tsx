import type { Metadata } from 'next';

/**
 * Widget iframe layout. Overrides root metadata so the favicon is not
 * preloaded here—the widget UI does not use it, which triggers the
 * "preloaded but not used" console warning.
 */
export const metadata: Metadata = {
  icons: [],
};

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-spaxio-widget-root
      className="h-screen w-full overflow-hidden bg-white opacity-100 dark:bg-black"
      style={{
        boxSizing: 'border-box',
        isolation: 'isolate',
      }}
    >
      {children}
    </div>
  );
}
