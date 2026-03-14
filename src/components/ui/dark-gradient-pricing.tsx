"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckoutButton } from "@/app/dashboard/billing/checkout-button";

interface BenefitProps {
  text: string;
  checked: boolean;
}

const Benefit = ({ text, checked }: BenefitProps) => {
  return (
    <div className="flex items-center gap-3">
      {checked ? (
        <span className="grid size-4 place-content-center rounded-full bg-primary text-sm text-primary-foreground shrink-0">
          <Check className="size-3" />
        </span>
      ) : (
        <span className="grid size-4 place-content-center rounded-full dark:bg-zinc-800 bg-zinc-200 text-sm dark:text-zinc-400 text-zinc-600 shrink-0">
          <X className="size-3" />
        </span>
      )}
      <span className="text-sm dark:text-zinc-300 text-zinc-600">{text}</span>
    </div>
  );
};

export interface PricingCardProps {
  tier: string;
  price: string;
  bestFor: string;
  CTA: string;
  benefits: Array<{ text: string; checked: boolean }>;
  /** When true, the CTA button uses the primary variant (e.g. for the featured plan). */
  featured?: boolean;
  className?: string;
  /** When set, show current plan badge with this label. */
  isCurrentPlan?: boolean;
  /** Label for current plan badge (e.g. "Current plan"). */
  currentPlanLabel?: string;
  /** When set, CTA is a link to this href (e.g. /contact for Enterprise). */
  ctaHref?: string;
  /** When set with ctaOrganizationId, CTA triggers Stripe checkout for this plan slug. */
  ctaPlanId?: string;
  /** Required when ctaPlanId is set (for checkout). */
  ctaOrganizationId?: string;
}

export const PricingCard = ({
  tier,
  price,
  bestFor,
  CTA,
  benefits,
  featured = false,
  className,
  isCurrentPlan = false,
  currentPlanLabel = "Current plan",
  ctaHref,
  ctaPlanId,
  ctaOrganizationId,
}: PricingCardProps) => {
  const renderCta = () => {
    if (isCurrentPlan) {
      return (
        <Button className="w-full" variant="outline" asChild>
          <Link href="/dashboard/billing">{CTA}</Link>
        </Button>
      );
    }
    if (ctaHref) {
      return (
        <Button className="w-full" variant={featured ? "default" : "ghost"} asChild>
          <Link href={ctaHref}>{CTA}</Link>
        </Button>
      );
    }
    if (ctaPlanId && ctaOrganizationId) {
      return (
        <CheckoutButton
          organizationId={ctaOrganizationId}
          planId={ctaPlanId}
          subscribeLabel={CTA}
          redirectingLabel="Redirecting..."
          variant={featured ? "default" : "ghost"}
          className="w-full"
        />
      );
    }
    return (
      <Button className="w-full" variant={featured ? "default" : "ghost"} disabled>
        {CTA}
      </Button>
    );
  };

  return (
    <motion.div
      initial={{ filter: "blur(2px)" }}
      whileInView={{ filter: "blur(0px)" }}
      transition={{ duration: 0.5, ease: "easeInOut", delay: 0.25 }}
    >
      <Card
        className={cn(
          "relative h-full w-full overflow-hidden border",
          "dark:border-zinc-700 dark:bg-gradient-to-br dark:from-zinc-950/50 dark:to-zinc-900/80",
          "border-zinc-200 bg-gradient-to-br from-zinc-50/50 to-zinc-100/80",
          "p-6",
          isCurrentPlan && "ring-2 ring-primary/50",
          className,
        )}
      >
        <div className="flex flex-col items-center border-b pb-6 dark:border-zinc-700 border-zinc-200">
          <div className="mb-6 flex items-center gap-2">
            <span className="inline-block dark:text-zinc-50 text-zinc-900">
              {tier}
            </span>
            {isCurrentPlan && (
              <Badge variant="secondary" className="font-normal">
                {currentPlanLabel}
              </Badge>
            )}
          </div>
          <span className="mb-3 inline-block text-4xl font-medium">
            {price}
          </span>
          <span className="dark:bg-gradient-to-br dark:from-zinc-200 dark:to-zinc-500 bg-gradient-to-br from-zinc-700 to-zinc-900 bg-clip-text text-center text-transparent">
            {bestFor}
          </span>
        </div>
        <div className="space-y-4 py-9">
          {benefits.map((benefit, index) => (
            <Benefit key={index} {...benefit} />
          ))}
        </div>
        {renderCta()}
      </Card>
    </motion.div>
  );
};
