import { NextResponse } from 'next/server';
import { requireAiSetupAccess } from '@/app/api/ai-setup/guard';
import { AI_SETUP_TEMPLATES, getRecommendedTemplatesForBusinessType } from '@/lib/ai-setup/templates';

/** GET /api/ai-setup/templates – list supported templates (for starter prompts / recommendations) */
export async function GET(request: Request) {
  try {
    const access = await requireAiSetupAccess();
    if ('response' in access) return access.response;

    const { searchParams } = new URL(request.url);
    const businessType = searchParams.get('business_type') ?? '';

    const recommended = businessType
      ? getRecommendedTemplatesForBusinessType(businessType).map((t) => ({
          key: t.key,
          title: t.title,
          description: t.description,
          suggestedGoal: t.suggestedGoal,
        }))
      : [];

    return NextResponse.json({
      templates: AI_SETUP_TEMPLATES.map((t) => ({
        key: t.key,
        title: t.title,
        description: t.description,
        defaultCaptureFields: t.defaultCaptureFields,
        suggestsEmail: t.suggestsEmail,
        suggestsWebhook: t.suggestsWebhook,
        suggestedGoal: t.suggestedGoal,
      })),
      recommended,
    });
  } catch {
    return NextResponse.json({ templates: [], recommended: [] });
  }
}
