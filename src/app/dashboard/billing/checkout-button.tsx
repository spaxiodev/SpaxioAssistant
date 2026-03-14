'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { ButtonProps } from '@/components/ui/button';

type CheckoutButtonProps = {
  organizationId: string;
  /** Plan slug for multi-tier checkout (e.g. starter, pro, business). Omit for legacy/default price. */
  planId?: string;
  subscribeLabel?: string;
  redirectingLabel?: string;
  variant?: ButtonProps['variant'];
  className?: string;
};

export function CheckoutButton({
  organizationId,
  planId,
  subscribeLabel = 'Subscribe now',
  redirectingLabel = 'Redirecting...',
  variant,
  className,
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, planId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || 'Failed to create checkout');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleCheckout} disabled={loading} variant={variant} className={className ?? 'rounded-lg'}>
      {loading ? redirectingLabel : subscribeLabel}
    </Button>
  );
}
