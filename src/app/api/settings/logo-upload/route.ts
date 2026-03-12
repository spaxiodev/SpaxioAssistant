import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrganizationId } from '@/lib/auth-server';
import { handleApiError } from '@/lib/api-error';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403, headers: corsHeaders });
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400, headers: corsHeaders });
    }

    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400, headers: corsHeaders });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400, headers: corsHeaders });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 2MB.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Use PNG, JPG, SVG, or WebP.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabase = createAdminClient();
    const bucket = 'public-assets';
    const fileExt = (file.name.split('.').pop() || 'png').toLowerCase().slice(0, 8);
    const objectPath = `widget-logos/${organizationId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
      contentType: file.type,
      upsert: true,
    });

    if (uploadError) {
      return NextResponse.json({ error: 'Upload failed' }, { status: 500, headers: corsHeaders });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(objectPath);

    const { error: updateError } = await supabase
      .from('business_settings')
      .update({ widget_logo_url: publicUrl })
      .eq('organization_id', organizationId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to save logo URL' }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ url: publicUrl }, { status: 200, headers: corsHeaders });
  } catch (err) {
    const res = handleApiError(err, 'settings/logo-upload');
    Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
}

