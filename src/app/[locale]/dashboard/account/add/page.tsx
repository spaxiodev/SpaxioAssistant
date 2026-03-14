import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export default async function AddAccountPage() {
  const t = await getTranslations('dashboard');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('addAccount')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a new account under your main one. This feature is coming soon.
        </p>
      </div>
      <Card className="border border-border-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5" />
            Coming soon
          </CardTitle>
          <CardDescription>
            You will be able to create sub-accounts or invite team members under your organization here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/dashboard/account">Back to Account</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
