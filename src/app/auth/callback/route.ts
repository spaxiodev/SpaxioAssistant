import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { ensureUserOrganization } from '@/lib/ensure-org';
import { routing } from '@/i18n/routing';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
  const locale =
    localeCookie && (routing.locales as readonly string[]).includes(localeCookie)
      ? (localeCookie as 'en' | 'fr-CA')
      : routing.defaultLocale;

  const pathWithLocale =
    next.startsWith('/en') || next.startsWith('/fr-CA')
      ? next
      : `/${locale}${next.startsWith('/') ? next : `/${next}`}`;

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await ensureUserOrganization(
            user.id,
            (user.user_metadata as { full_name?: string })?.full_name,
            (user.user_metadata as { business_name?: string })?.business_name ?? null,
            (user.user_metadata as { industry?: string })?.industry ?? null
          );
        }
        return NextResponse.redirect(`${origin}${pathWithLocale}`);
      }
    } catch (err) {
      console.error('[auth/callback]', err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.redirect(`${origin}/${locale}/login?error=auth_callback`);
}
