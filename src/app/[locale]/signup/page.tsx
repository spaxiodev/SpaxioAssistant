'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { Link, useRouter } from '@/i18n/navigation';

export default function SignupPage() {
  const t = useTranslations('signup');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      // Set locale cookie so auth callback can redirect to the same locale
      document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=3600`;
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: fullName ? { full_name: fullName } : undefined,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      if (data.session) {
        router.replace('/dashboard');
        return;
      }
      setMessage(t('checkEmail'));
      setEmail('');
      setPassword('');
      setFullName('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.24),transparent_34%),radial-gradient(circle_at_85%_20%,rgba(34,211,238,0.18),transparent_24%),radial-gradient(circle_at_bottom,rgba(251,191,36,0.14),transparent_30%)]" />
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm border-white/50 bg-white/80 dark:bg-card/78">
        <CardHeader className="space-y-3">
          <Link href="/" className="mx-auto flex flex-col items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
            <img src="/icon.png" alt="" className="h-10 w-10 shrink-0 object-contain" aria-hidden />
            <span>{tCommon('appName')}</span>
          </Link>
          <CardTitle className="text-2xl text-center">{t('title')}</CardTitle>
          <CardDescription className="text-center">
            {t('description')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="text-sm text-muted-foreground" role="status">
                {message}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{tCommon('email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{tCommon('password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">{t('fullNameLabel')}</Label>
              <Input
                id="fullName"
                type="text"
                placeholder={t('fullNamePlaceholder')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                disabled={loading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('creatingAccount') : t('signUp')}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t('hasAccount')}{' '}
              <Link
                href="/login"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {t('logIn')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
      <Button variant="ghost" asChild className="bg-background/60 backdrop-blur">
        <Link href="/">{tCommon('backToHome')}</Link>
      </Button>
    </div>
  );
}
