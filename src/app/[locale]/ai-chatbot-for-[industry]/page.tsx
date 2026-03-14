import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getIndustryContent, INDUSTRY_SLUGS } from '@/content/industry';
import { buildPageMetadata } from '@/lib/seo';
import { LandingPage } from '@/components/seo/landing-page';

type Props = { params: Promise<{ locale: string; industry: string }> };

export function generateStaticParams() {
  return INDUSTRY_SLUGS.flatMap((industry) =>
    ['en', 'fr'].map((locale) => ({ locale, industry }))
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale, industry } = await params;
  const content = getIndustryContent(industry);
  if (!content) return {};
  return buildPageMetadata(
    {
      title: content.metaTitle,
      description: content.metaDescription,
    },
    `/${locale}/ai-chatbot-for-${industry}`
  );
}

export default async function IndustryChatbotPage({ params }: Props) {
  const { locale, industry } = await params;
  setRequestLocale(locale);
  const content = getIndustryContent(industry);
  if (!content) notFound();

  const path = `/ai-chatbot-for-${industry}`;

  return (
    <LandingPage
      locale={locale}
      breadcrumbName={`AI Chatbot for ${content.industryName}`}
      path={path}
      heroTitle={content.heroTitle}
      heroSubtitle={content.heroSubtitle}
      sections={content.sections}
      faq={content.faq}
      ctaTitle={content.ctaTitle}
      ctaDescription={content.ctaDescription}
      ctaPrimaryHref="/signup"
      ctaPrimaryLabel={content.ctaPrimary}
      ctaSecondaryHref="/pricing"
      ctaSecondaryLabel={content.ctaSecondary}
    />
  );
}
