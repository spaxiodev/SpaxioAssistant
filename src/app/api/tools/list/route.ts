import { getOrganizationId } from '@/lib/auth-server';
import { NextResponse } from 'next/server';
import { getAllTools } from '@/lib/tools/registry';
import { handleApiError } from '@/lib/api-error';

/**
 * GET /api/tools/list
 * Returns all available tool definitions (id, name, description, parameters) for dashboard agent config.
 */
export async function GET() {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const tools = getAllTools().map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));

    return NextResponse.json({ tools });
  } catch (err) {
    return handleApiError(err, 'tools/list');
  }
}
