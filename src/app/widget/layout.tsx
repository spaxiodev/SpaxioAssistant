export const dynamic = 'force-dynamic';

export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-spaxio-widget-root
      className="min-h-screen min-w-full bg-white dark:bg-[#0f172a] opacity-100"
      style={{
        backgroundColor: '#ffffff',
        boxSizing: 'border-box',
        isolation: 'isolate',
      }}
    >
      {children}
    </div>
  );
}
