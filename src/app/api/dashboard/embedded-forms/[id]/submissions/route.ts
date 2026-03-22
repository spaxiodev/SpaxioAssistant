/**
 * Dashboard: list submissions for a form, or update a submission status. Auth required.
 */

import { NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth-server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleApiError } from '@/lib/api-error';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: formId } = await params;
    const supabase = createAdminClient();

    // Verify form ownership
    const { data: form } = await supabase
      .from('embedded_forms')
      .select('id, name')
      .eq('id', formId)
      .eq('organization_id', orgId)
      .single();
    if (!form) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: submissions, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('form_id', formId)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ submissions: submissions ?? [], form_name: form.name });
  } catch (err) {
    return handleApiError(err, 'dashboard/embedded-forms/[id]/submissions GET');
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const orgId = await getOrganizationId();
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: formId } = await params;
    const body = await request.json().catch(() => ({}));
    const submissionId = typeof body.submission_id === 'string' ? body.submission_id : null;
    if (!submissionId) return NextResponse.json({ error: 'submission_id required' }, { status: 400 });

    const VALID_STATUSES = ['new', 'reviewed', 'contacted', 'converted', 'archived'];
    const status = VALID_STATUSES.includes(body.status) ? body.status : null;
    if (!status) return NextResponse.json({ error: 'valid status required' }, { status: 400 });

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('form_submissions')
      .update({ status })
      .eq('id', submissionId)
      .eq('form_id', formId)
      .eq('organization_id', orgId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, status });
  } catch (err) {
    return handleApiError(err, 'dashboard/embedded-forms/[id]/submissions PATCH');
  }
}
