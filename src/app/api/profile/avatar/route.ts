import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const formData = await request.formData().catch(() => null);
    if (!formData) return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });

    const file = formData.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    if (file.size === 0) return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large. Maximum size is 2MB.' }, { status: 400 });
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Use PNG, JPG, or WebP.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const admin = createAdminClient();
    const bucket = 'public-assets';
    const fileExt = (file.name.split('.').pop() || 'png').toLowerCase().slice(0, 8);
    const objectPath = `avatars/${user.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await admin.storage.from(bucket).upload(objectPath, buffer, {
      contentType: file.type,
      upsert: true,
    });

    if (uploadError) return NextResponse.json({ error: 'Upload failed' }, { status: 500 });

    const { data: { publicUrl } } = admin.storage.from(bucket).getPublicUrl(objectPath);

    const { error: updateError } = await admin
      .from('profiles')
      .upsert(
        { id: user.id, avatar_url: publicUrl, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );

    if (updateError) return NextResponse.json({ error: 'Failed to save avatar' }, { status: 500 });

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    return handleApiError(err, 'profile/avatar');
  }
}
