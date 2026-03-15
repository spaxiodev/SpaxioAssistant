/**
 * Temporary debug page to verify routing. Visit /en/test-route or /fr/test-route.
 * After confirming /dashboard works, this can be removed.
 */
export default async function TestRoutePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div className="p-8 font-mono text-sm">
      <h1 className="text-lg font-bold">Test route</h1>
      <p>If you see this, locale-prefixed routing works.</p>
      <p className="mt-2 text-muted-foreground">Locale: {locale}</p>
    </div>
  );
}
