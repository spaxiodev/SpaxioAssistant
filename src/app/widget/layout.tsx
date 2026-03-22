export const dynamic = 'force-dynamic';

export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-spaxio-widget-root
      className="min-h-screen min-w-full bg-white dark:bg-black opacity-100"
      style={{
        boxSizing: 'border-box',
        isolation: 'isolate',
      }}
    >
      {children}
    </div>
  );
}
