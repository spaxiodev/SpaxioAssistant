export const dynamic = 'force-dynamic';

export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-spaxio-widget-root
      className="w-full bg-white"
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
