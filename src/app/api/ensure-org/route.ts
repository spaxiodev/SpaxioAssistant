import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error';

export async function POST() {
  try {
    const organizationId = await getOrganizationId();
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization' }, { status: 403 });
    }
    return NextResponse.json({ organizationId });
  } catch (err) {
    return handleApiError(err, 'ensure-org');
  }
}
