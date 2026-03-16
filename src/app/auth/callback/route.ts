import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { ensureUserOrganization } from '@/lib/ensure-org';
import { routing } from '@/i18n/routing';

const AUTH_RETURN_TO_COOKIE = 'auth_return_to';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const cookieStore = await cookies();

  // Prefer next from URL (e.g. email magic link); fall back to cookie (set before OAuth so we don't lose it when provider strips query)
  const nextFromQuery = searchParams.get('next');
  const nextFromCookie = cookieStore.get(AUTH_RETURN_TO_COOKIE)?.value;
  const next = nextFromQuery ?? nextFromCookie ?? '/dashboard';

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
          const meta = user.user_metadata as {
            full_name?: string;
            name?: string;
            user_name?: string;
            business_name?: string;
            industry?: string;
          };
          const fullName =
            meta.full_name ?? meta.name ?? meta.user_name ?? undefined;
          await ensureUserOrganization(
            user.id,
            fullName,
            meta.business_name ?? null,
            meta.industry ?? null
          );
        }
        const res = NextResponse.redirect(`${origin}${pathWithLocale}`);
        // Clear return-to cookie after successful redirect
        res.cookies.set(AUTH_RETURN_TO_COOKIE, '', { path: '/', maxAge: 0 });
        return res;
      }
    } catch (err) {
      console.error('[auth/callback]', err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.redirect(`${origin}/${locale}/login?error=auth_callback`);
}
