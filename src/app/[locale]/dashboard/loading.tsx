export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-9 w-48 rounded bg-muted" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border bg-card p-6">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="mt-2 h-8 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
      <div className="h-32 rounded-xl border bg-card" />
    </div>
  );
}
