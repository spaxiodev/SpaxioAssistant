'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@/components/intl-link';
import { UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

type InviteDetails = {
  valid: true;
  email: string;
  role_label: string | null;
  organization_name: string | null;
  inviter_name: string | null;
  expires_at: string;
};

type InvalidResponse = { valid: false; error: string };

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={<InviteAcceptSkeleton />}>
      <InviteAcceptContent />
    </Suspense>
  );
}

function InviteAcceptSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">Loading invitation…</p>
        </CardContent>
      </Card>
    </div>
  );
}

function InviteAcceptContent() {
  const t = useTranslations('inviteAccept');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const token = searchParams.get('token');

  const [details, setDetails] = useState<InviteDetails | InvalidResponse | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setDetails({ valid: false, error: 'missing_token' });
      return;
    }
    fetch(`/api/team/accept?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => setDetails(data))
      .catch(() => setDetails({ valid: false, error: 'invalid_token' }));
  }, [token]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });
  }, []);

  const acceptPath = `/${locale}/invite/accept${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  const loginRedirect = `/${locale}/login?redirectTo=${encodeURIComponent(acceptPath)}`;
  const signupRedirect = `/${locale}/signup?redirectTo=${encodeURIComponent(acceptPath)}`;

  async function handleAccept() {
    if (!token || !details || !('valid' in details) || !details.valid) return;
    setError(null);
    setAccepting(true);
    try {
      const res = await fetch('/api/team/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to accept');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError(t('acceptFailed'));
    } finally {
      setAccepting(false);
    }
  }

  if (details === null) {
    return <InviteAcceptSkeleton />;
  }

  if (!details.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive/30">
          <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="h-6 w-6" />
            </div>
            <CardTitle className="text-center">{t('invalidTitle')}</CardTitle>
            <CardDescription className="text-center">
              {details.error === 'expired' && t('expiredDescription')}
              {details.error === 'revoked' && t('revokedDescription')}
              {(details.error === 'invalid_token' || details.error === 'missing_token') && t('invalidDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">{t('askOwnerToResend')}</p>
            <Button asChild className="w-full">
              <Link href="/">{tCommon('backToHome')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoggedIn = !!userEmail;
  const emailMatches = userEmail?.toLowerCase() === details.email.toLowerCase();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md border-white/50 bg-card/95">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserPlus className="h-6 w-6" />
          </div>
          <CardTitle className="text-center text-xl">{t('title')}</CardTitle>
          <CardDescription className="text-center">
            {details.inviter_name
              ? t('invitedBy', { name: details.inviter_name, org: details.organization_name || t('workspace') })
              : t('invitedToOrg', { org: details.organization_name || t('workspace') })}
          </CardDescription>
          <p className="text-center text-sm text-muted-foreground">
            {t('inviteEmail')}: <strong>{details.email}</strong>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {!isLoggedIn && (
            <div className="space-y-2">
              <p className="text-center text-sm text-muted-foreground">{t('signInToAccept')}</p>
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <Link href={loginRedirect}>{t('signIn')}</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href={signupRedirect}>{t('createAccount')}</Link>
                </Button>
              </div>
            </div>
          )}

          {isLoggedIn && !emailMatches && (
            <p className="text-center text-sm text-destructive">
              {t('emailMismatch', { email: details.email })}
            </p>
          )}

          {isLoggedIn && emailMatches && (
            <div className="space-y-2">
              <Button
                className="w-full gap-2"
                onClick={handleAccept}
                disabled={accepting}
              >
                <CheckCircle className="h-4 w-4" />
                {accepting ? t('accepting') : t('acceptButton')}
              </Button>
              <p className="text-center text-xs text-muted-foreground">{t('acceptHint')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
