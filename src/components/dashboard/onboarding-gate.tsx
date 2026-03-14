'use client';

import { useState, useEffect } from 'react';
import { OnboardingModal } from '@/components/dashboard/onboarding-modal';

const SKIP_KEY = 'onboarding_skipped';

type OnboardingGateProps = {
  needsOnboarding: boolean;
};

export function OnboardingGate({ needsOnboarding }: OnboardingGateProps) {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!needsOnboarding) return;
    if (typeof window === 'undefined') return;
    const skipped = sessionStorage.getItem(SKIP_KEY);
    setShowModal(!skipped);
  }, [needsOnboarding]);

  const handleSkip = () => {
    sessionStorage.setItem(SKIP_KEY, '1');
    setShowModal(false);
  };

  const handleComplete = () => {
    setShowModal(false);
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
