import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { Link } from '@/components/intl-link';
import { AiPageForm } from '@/components/ai-page/ai-page-form';

export default async function NewAiPagePage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const { data: agents } = await supabase
    .from('agents')
    .select('id, name')
    .eq('organization_id', orgId)
    .order('name');

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/ai-pages" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to AI Pages
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Create AI Page</h1>
        <p className="text-muted-foreground">
          Set up a full-page assistant for quotes, support, intake, or a custom flow.
        </p>
      </div>
      <AiPageForm agents={agents ?? []} />
    </div>
  );
}
