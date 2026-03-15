/**
 * POST /api/ai-setup/logo-upload
 * Upload widget logo for AI Setup. Returns public URL only; does not update business_settings.
 * Apply logo on Publish. Requires active subscription; logo use may require custom_branding (enforced at publish if needed).
 */

import { NextResponse } from 'next/server';
import { requireAiSetupAccess } from '@/app/api/ai-setup/guard';
import { handleApiError } from '@/lib/api-error';

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export async function POST(request: Request) {
  try {
    const access = await requireAiSetupAccess();
    if ('response' in access) return access.response;
    const { orgId, supabase } = access;

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 2MB.' },
        { status: 400 }
      );
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Use PNG, JPG, SVG, or WebP.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const bucket = 'public-assets';
    const fileExt = (file.name.split('.').pop() || 'png').toLowerCase().slice(0, 8);
    const objectPath = `widget-logos/ai-setup-${orgId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
      contentType: file.type,
      upsert: true,
    });

    if (uploadError) {
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(objectPath);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    return handleApiError(err, 'ai-setup/logo-upload');
  }
}
