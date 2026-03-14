import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { PricingCard } from "@/components/ui/dark-gradient-pricing";
import { getOrganizationId } from "@/lib/auth-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanForOrg } from "@/lib/entitlements";
import { Link } from '@/i18n/navigation';
import { buildPageMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return buildPageMetadata(
    {
      title: 'Pricing',
      description:
        'Spaxio Assistant pricing: start free, scale with your business. Plans for AI chatbots, AI agents, CRM automation, and website deployment.',
    },
    `/${locale}/pricing`
  );
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");
  const tCommon = await getTranslations("common");

  const orgId = await getOrganizationId();
  let currentPlanSlug: string | null = null;
  if (orgId) {
    const supabase = createAdminClient();
    const plan = await getPlanForOrg(supabase, orgId);
    currentPlanSlug = plan?.slug ?? null;
  }

  const isCurrent = (slug: string) => currentPlanSlug === slug;

  return (
    <section className="relative overflow-hidden bg-background text-foreground">
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 md:px-8">
        <div className="mb-8">
          <Link
            href={orgId ? "/dashboard" : "/"}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <span aria-hidden>←</span>
            {tCommon("backToDashboard")}
          </Link>
        </div>
        <div className="mb-12 space-y-3">
          <h2 className="text-center text-3xl font-semibold leading-tight sm:text-4xl sm:leading-tight md:text-5xl md:leading-tight">
            {t("title")}
          </h2>
          <p className="text-center text-base text-muted-foreground md:text-lg">
            {t("subtitle")}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          <PricingCard
            tier={t("tiers.free.name")}
            price={t("tiers.free.price")}
            bestFor={t("tiers.free.bestFor")}
            CTA={t("tiers.free.cta")}
            isCurrentPlan={isCurrent("free")}
            currentPlanLabel={t("currentPlan")}
            ctaHref={orgId ? "/dashboard" : "/login"}
            benefits={[
              { text: t("benefits.agentsFree"), checked: true },
              { text: t("benefits.messagesFree"), checked: true },
              { text: t("benefits.knowledgeFree"), checked: true },
              { text: t("benefits.tools"), checked: false },
              { text: t("benefits.automations"), checked: false },
              { text: t("benefits.branding"), checked: false },
            ]}
          />
          <PricingCard
            tier={t("tiers.starter.name")}
            price={t("tiers.starter.price")}
            bestFor={t("tiers.starter.bestFor")}
            CTA={t("tiers.starter.cta")}
            isCurrentPlan={isCurrent("starter")}
            currentPlanLabel={t("currentPlan")}
            ctaPlanId={orgId ? "starter" : undefined}
            ctaOrganizationId={orgId ?? undefined}
            benefits={[
              { text: t("benefits.agentsStarter"), checked: true },
              { text: t("benefits.messagesStarter"), checked: true },
              { text: t("benefits.knowledgeStarter"), checked: true },
              { text: t("benefits.tools"), checked: false },
              { text: t("benefits.automations"), checked: false },
              { text: t("benefits.branding"), checked: true },
            ]}
          />
          <PricingCard
            tier={t("tiers.pro.name")}
            price={t("tiers.pro.price")}
            bestFor={t("tiers.pro.bestFor")}
            CTA={t("tiers.pro.cta")}
            featured
            isCurrentPlan={isCurrent("pro") || isCurrent("legacy_assistant_pro")}
            currentPlanLabel={t("currentPlan")}
            ctaPlanId={orgId ? "pro" : undefined}
            ctaOrganizationId={orgId ?? undefined}
            benefits={[
              { text: t("benefits.agentsPro"), checked: true },
              { text: t("benefits.messagesPro"), checked: true },
              { text: t("benefits.knowledgePro"), checked: true },
              { text: t("benefits.tools"), checked: true },
              { text: t("benefits.automations"), checked: true },
              { text: t("benefits.branding"), checked: true },
            ]}
          />
          <PricingCard
            tier={t("tiers.business.name")}
            price={t("tiers.business.price")}
            bestFor={t("tiers.business.bestFor")}
            CTA={t("tiers.business.cta")}
            isCurrentPlan={isCurrent("business")}
            currentPlanLabel={t("currentPlan")}
            ctaPlanId={orgId ? "business" : undefined}
            ctaOrganizationId={orgId ?? undefined}
            benefits={[
              { text: t("benefits.agentsBusiness"), checked: true },
              { text: t("benefits.messagesBusiness"), checked: true },
              { text: t("benefits.knowledgeBusiness"), checked: true },
              { text: t("benefits.tools"), checked: true },
              { text: t("benefits.automations"), checked: true },
              { text: t("benefits.branding"), checked: true },
              { text: t("benefits.apiAccess"), checked: true },
            ]}
          />
          <PricingCard
            tier={t("tiers.enterprise.name")}
            price={t("tiers.enterprise.price")}
            bestFor={t("tiers.enterprise.bestFor")}
            CTA={t("tiers.enterprise.cta")}
            isCurrentPlan={isCurrent("enterprise")}
            currentPlanLabel={t("currentPlan")}
            ctaHref="/contact"
            benefits={[
              { text: t("benefits.agentsEnterprise"), checked: true },
              { text: t("benefits.messagesEnterprise"), checked: true },
              { text: t("benefits.knowledgeEnterprise"), checked: true },
              { text: t("benefits.tools"), checked: true },
              { text: t("benefits.automations"), checked: true },
              { text: t("benefits.branding"), checked: true },
              { text: t("benefits.apiAccess"), checked: true },
              { text: t("benefits.support"), checked: true },
            ]}
          />
        </div>
        {orgId && (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            <Link href="/dashboard/billing" className="underline hover:no-underline">
              Manage subscription
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
