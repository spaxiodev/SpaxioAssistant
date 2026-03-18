import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { routing } from '@/i18n/routing';

const handleI18nRouting = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  // 1. Run next-intl (locale detection, redirect / to /en or /fr, etc.)
  let response = handleI18nRouting(request);

  // If next-intl returned a redirect, return it
  if (response.status >= 300 && response.status < 400) {
    return response;
  }

  const path = request.nextUrl.pathname;
  const segments = path.split('/').filter(Boolean);
  const locale = segments[0];
  const isLocalePath = locale && (routing.locales as readonly string[]).includes(locale);

  if (!isLocalePath) {
    return response;
  }

  // Redirect root/home to dashboard so visitors land on dashboard first
  const isHomeOnly = path === `/${locale}`;
  if (isHomeOnly) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  // 2. Supabase auth for locale-prefixed dashboard/auth routes
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return response;
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    await supabase.auth.getSession();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Dashboard: allow unauthenticated access (guests see dashboard with sign-in modal)
    const isAuthPage =
      path === `/${locale}/login` || path === `/${locale}/signup`;

    if (isAuthPage && user) {
      const redirectTo = request.nextUrl.searchParams.get('redirectTo');
      const target =
        redirectTo && redirectTo.startsWith('/') && (redirectTo.startsWith('/en') || redirectTo.startsWith('/fr-CA'))
          ? new URL(redirectTo, request.url)
          : new URL(`/${locale}/dashboard`, request.url);
      return NextResponse.redirect(target);
    }
  } catch (err) {
    console.error('[proxy] Supabase auth error:', err instanceof Error ? err.message : err);
    // Allow the request through so the app can show login or handle the error
  }

  return response;
}

export const config = {
  // Match all pathnames except api, auth, _next, static files
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)'],
};
