'use client';

import { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { OnboardingModal } from '@/components/dashboard/onboarding-modal';

const SKIP_KEY = 'onboarding_skipped';

type OnboardingGateProps = {
  needsOnboarding: boolean;
};

export function OnboardingGate({ needsOnboarding }: OnboardingGateProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!needsOnboarding) return;
    if (typeof window === 'undefined') return;
    const skipped = sessionStorage.getItem(SKIP_KEY);
    setShowModal(!skipped);
  }, [needsOnboarding]);

  const goToAiSetup = () => {
    setShowModal(false);
    router.push('/dashboard/ai-setup');
  };

  const handleSkip = () => {
    sessionStorage.setItem(SKIP_KEY, '1');
    goToAiSetup();
  };

  const handleComplete = () => {
    goToAiSetup();
  };

  if (!showModal) return null;

  return (
    <OnboardingModal
      open={showModal}
      onSkip={handleSkip}
      onComplete={handleComplete}
    />
  );
}
