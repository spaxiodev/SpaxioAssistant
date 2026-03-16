import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { listAiPagesForOrg } from '@/lib/ai-pages/config-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/components/intl-link';
import { getTranslations } from 'next-intl/server';
import { Plus, ExternalLink, Copy, FileText, HeadphonesIcon, Calendar } from 'lucide-react';
import { AiPagesListClient } from '@/components/ai-page/ai-pages-list-client';

const pageTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  quote: FileText,
  support: HeadphonesIcon,
  booking: Calendar,
  intake: Calendar,
  general: FileText,
};
const pageTypeLabels: Record<string, string> = {
  quote: 'Quote',
  support: 'Support',
  booking: 'Booking',
  intake: 'Intake',
  sales: 'Sales',
  product_finder: 'Product finder',
  general: 'General',
  custom: 'Custom',
};

export default async function AiPagesDashboardPage() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const supabase = createAdminClient();
  const pages = await listAiPagesForOrg(supabase, orgId);
  const t = await getTranslations('dashboard');
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Pages</h1>
          <p className="text-muted-foreground">
            Full-page AI experiences for quotes, support, intake, and more. Share a link or hand off from the widget.
          </p>
        </div>
        <Link href="/dashboard/ai-pages/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create AI Page
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your AI Pages</CardTitle>
          <CardDescription>
            Create and publish dedicated pages. Use deployment mode to allow widget handoff.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 p-8 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">No AI pages yet.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create a Quote Assistant, Support page, or custom page to get started.
              </p>
              <Link href="/dashboard/ai-pages/new">
                <Button className="mt-4">Create your first AI Page</Button>
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {pages.map((page) => {
                const Icon = pageTypeIcons[page.page_type] ?? FileText;
                const publicUrl = `${baseUrl}/en/a/${page.slug}`;
                return (
                  <li key={page.id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{page.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {pageTypeLabels[page.page_type] ?? page.page_type} · {page.deployment_mode.replace(/_/g, ' ')}
                        </p>
                      </div>
                      {page.is_published ? (
                        <Badge variant="default">Published</Badge>
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <AiPagesListClient
                        pageId={page.id}
                        slug={page.slug}
                        isPublished={page.is_published}
                        publicUrl={publicUrl}
                      />
                      <Link href={`/dashboard/ai-pages/${page.id}`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                      <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
