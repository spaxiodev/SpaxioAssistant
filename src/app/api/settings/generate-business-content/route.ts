/**
 * POST /api/settings/generate-business-content
 * Body: { type: 'company_description' | 'services', businessName?: string, industry?: string }
 * Generates company description or services list via AI based on business name and industry.
 */
import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { getChatCompletion } from '@/lib/ai/provider';
import { handleApiError } from '@/lib/api-error';

export async function POST(request: Request) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const type = body.type === 'company_description' || body.type === 'services' ? body.type : null;
    const businessName = typeof body.businessName === 'string' ? body.businessName.trim() : '';
    const industry = typeof body.industry === 'string' ? body.industry.trim() : '';
    const companyDescription = typeof body.companyDescription === 'string' ? body.companyDescription.trim() : '';

    if (!type) {
      return NextResponse.json({ error: 'type must be company_description or services' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
    }

    const context = [businessName, industry].filter(Boolean).join(' — ');
    if (!context) {
      return NextResponse.json(
        { error: 'Provide at least business name or industry to generate content' },
        { status: 400 }
      );
    }

    if (type === 'company_description') {
      const systemPrompt = `You are a copywriter helping a business fill out their profile. Generate a concise, professional company description (2-4 sentences) for use on a website and AI assistant. Base it strictly on the business name and industry provided. Do not invent details. Keep it under 200 words.`;
      const userPrompt = `Business: ${context}\n\nGenerate a company description:`;
      const result = await getChatCompletion('openai', process.env.OPENAI_MODEL ?? 'gpt-4o-mini', [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ], { max_tokens: 300, temperature: 0.7 });
      return NextResponse.json({ content: result.content?.trim() ?? '' });
    }

    // type === 'services'
    const systemPrompt = `You are helping a business list their services. Generate a list of 4-10 services typical for this type of business. Return exactly one service per line, no bullets or numbers. Base it on the business name and industry (and optionally existing company description). Do not invent unrelated services.`;
    const userContent = companyDescription
      ? `Business: ${context}\n\nCompany description: ${companyDescription}\n\nGenerate a list of services (one per line):`
      : `Business: ${context}\n\nGenerate a list of services (one per line):`;
    const result = await getChatCompletion('openai', process.env.OPENAI_MODEL ?? 'gpt-4o-mini', [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ], { max_tokens: 250, temperature: 0.6 });
    const lines = (result.content ?? '')
      .split('\n')
      .map((s) => s.replace(/^[-*•]\s*|\d+\.\s*/g, '').trim())
      .filter(Boolean);
    return NextResponse.json({ content: lines.join('\n') });
  } catch (err) {
    return handleApiError(err, 'settings/generate-business-content');
  }
}
