import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { routing } from '@/i18n/routing';
import { getOrganizationId, getUser } from '@/lib/auth-server';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { HelpChatGate } from '@/components/help-chat-gate';
import { LazyToaster } from '@/components/lazy-toaster';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    const headersList = await headers();
    const locale = headersList.get('x-next-intl-locale') ?? routing.defaultLocale;
    redirect(`/${locale}/login`);
  }

  const orgId = await getOrganizationId(user);

  if (!orgId) {
    const headersList = await headers();
    const locale = headersList.get('x-next-intl-locale') ?? routing.defaultLocale;
    redirect(`/${locale}/login`);
  }

  return (
    <>
      <div className="relative flex bg-transparent">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.12),transparent_26%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_24%)]" />
        <Sidebar />
        <div className="relative ml-56 flex min-h-screen flex-1 flex-col">
          <Header />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
      <HelpChatGate />
      <LazyToaster />
    </>
  );
}
