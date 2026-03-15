/**
 * Server-side helpers: resolve current user's role and permissions for an organization.
 * Use for route guards and API permission checks.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { parsePermissions, type TeamPermissions } from '@/lib/team-permissions';

export type OrgMemberRole = 'owner' | 'admin' | 'member';

export type TeamMemberAuth = {
  organizationId: string;
  userId: string;
  role: OrgMemberRole;
  roleLabel: string | null;
  permissions: TeamPermissions;
  isOwner: boolean;
  canManageTeamMembers: boolean;
};

type OrgMemberRow = {
  organization_id: string;
  user_id: string;
  role: string;
  role_label: string | null;
  permissions: unknown;
};

/** Get current user's membership and permissions for an org. Returns null if not a member. */
export async function getTeamMemberAuth(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<TeamMemberAuth | null> {
  const { data: row, error } = await supabase
    .from('organization_members')
    .select('organization_id, user_id, role, role_label, permissions')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !row) return null;
  const m = row as OrgMemberRow;
  const role = (m.role === 'owner' || m.role === 'admin' || m.role === 'member' ? m.role : 'member') as OrgMemberRole;
  const isOwner = role === 'owner';
  const permissions = parsePermissions(m.permissions);

  return {
    organizationId: m.organization_id,
    userId: m.user_id,
    role,
    roleLabel: m.role_label ?? null,
    permissions,
    isOwner,
    canManageTeamMembers: isOwner || permissions.manage_team_members,
  };
}

/** Ensure current user is the org owner. Throws or returns false if not. Use in API routes. */
export async function requireOwner(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<TeamMemberAuth> {
  const auth = await getTeamMemberAuth(supabase, organizationId, userId);
  if (!auth || !auth.isOwner) {
    throw new Error('Forbidden: only the account owner can perform this action');
  }
  return auth;
}

/** Ensure current user can manage team members (owner or has manage_team_members). */
export async function requireCanManageTeam(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<TeamMemberAuth> {
  const auth = await getTeamMemberAuth(supabase, organizationId, userId);
  if (!auth || !auth.canManageTeamMembers) {
    throw new Error('Forbidden: you do not have permission to manage team members');
  }
  return auth;
}

/** Check if user has a specific permission in the org. */
export async function checkTeamPermission(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  permission: keyof TeamPermissions
): Promise<boolean> {
  const auth = await getTeamMemberAuth(supabase, organizationId, userId);
  if (!auth) return false;
  if (auth.isOwner) return true;
  return auth.permissions[permission] === true;
}
