'use client';

import { useState, useEffect, useCallback } from 'react';

export type NextAction = {
  id: string;
  label: string;
  description: string;
  href: string;
};

export type NextActionState = {
  action: NextAction;
  progress: {
    businessInfoDone: boolean;
    aiTrainedDone: boolean;
    widgetReadyDone: boolean;
    hasWebsiteUrl: boolean;
  };
  counts: { leads: number; conversations: number; quoteRequests: number };
};

export function useNextBestAction(): {
  data: NextActionState | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<NextActionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/simple/next-action');
      if (!res.ok) throw new Error('Failed to fetch next action');
      const json = await res.json();
      setData({
        action: json.action,
        progress: json.progress,
        counts: json.counts,
      });
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
