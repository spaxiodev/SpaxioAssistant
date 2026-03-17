'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Check, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SimplePageHeader, SimpleDeveloperModeLink } from '@/components/dashboard/simple';
import { useViewMode } from '@/contexts/view-mode-context';

type BillingStatus = {
  planName: string;
  planSlug: string;
  status: string;
  isActive: boolean;
  isTrialing: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  usage?: {
    messages: number;
    messageLimit: number;
    messagesRemaining: number;
    aiActions: number;
    aiActionLimit: number;
    aiActionsRemaining: number;
    periodEnd: string;
  };
  blockedReasons?: Array<{ message: string }>;
  upgradeRecommendations?: string[];
};

export function SimpleBillingPage() {
  const router = useRouter();
  const { setMode } = useViewMode();
  const [status, setStatus] = useState<BillingStatus | null>(null);

  const openBillingInDeveloperMode = () => {
    setMode('developer');
    router.push('/dashboard/billing');
  };
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/billing/status')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const messagePercent =
    status?.usage && status.usage.messageLimit > 0
      ? Math.min(100, Math.round((status.usage.messages / status.usage.messageLimit) * 100))
      : 0;
  const aiPercent =
    status?.usage && status.usage.aiActionLimit > 0
      ? Math.min(100, Math.round((status.usage.aiActions / status.usage.aiActionLimit) * 100))
      : 0;

  return (
    <div className="space-y-8">
      <SimplePageHeader
        title="Billing & plan"
        description="Your current plan, what’s included, and what’s locked. Upgrade to unlock more features and higher limits."
        icon={<CreditCard className="h-6 w-6" />}
      />

      {loading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Loading…</CardContent>
        </Card>
      )}

      {!loading && status && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current plan</CardTitle>
              <CardDescription>
                {status.planName} — {status.isActive ? (status.isTrialing ? 'Free trial' : 'Active') : 'Inactive'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{status.planName}</span>
                {status.currentPeriodEnd && status.isActive && !status.isTrialing && (
                  <span className="text-sm text-muted-foreground">
                    Renews {new Date(status.currentPeriodEnd).toLocaleDateString()}
                  </span>
                )}
                {status.isTrialing && status.trialEndsAt && (
                  <span className="text-sm text-muted-foreground">
                    Trial ends {new Date(status.trialEndsAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={openBillingInDeveloperMode}>
                {!status.isActive && status.planSlug === 'free' ? 'Upgrade plan' : 'Manage subscription'}
              </Button>
              <p className="text-xs text-muted-foreground">
                You’ll switch to Developer Mode to upgrade or manage your subscription.
              </p>
            </CardContent>
          </Card>

          {status.usage && (status.usage.messageLimit > 0 || status.usage.aiActionLimit > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Usage this period</CardTitle>
                <CardDescription>
                  Through {status.usage.periodEnd}. Upgrade for higher limits.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {status.usage.messageLimit > 0 && (
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Chat messages</span>
                      <span>
                        {status.usage.messages} / {status.usage.messageLimit}
                      </span>
                    </div>
                    <Progress value={messagePercent} className="mt-1" />
                  </div>
                )}
                {status.usage.aiActionLimit > 0 && (
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>AI actions</span>
                      <span>
                        {status.usage.aiActions} / {status.usage.aiActionLimit}
                      </span>
                    </div>
                    <Progress value={aiPercent} className="mt-1" />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {status.blockedReasons && status.blockedReasons.length > 0 && (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Limits reached
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {status.blockedReasons.map((r, i) => (
                    <li key={i}>{r.message}</li>
                  ))}
                </ul>
                <Button className="mt-3" onClick={openBillingInDeveloperMode}>
                  Upgrade to get more
                </Button>
              </CardContent>
            </Card>
          )}

          {status.upgradeRecommendations && status.upgradeRecommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  What the next plan unlocks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {status.upgradeRecommendations.slice(0, 5).map((rec, i) => (
                    <li key={i}>• {rec}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <SimpleDeveloperModeLink
        developerPath="/dashboard/billing"
        linkLabel="Open Billing in Developer Mode"
      />
    </div>
  );
}
