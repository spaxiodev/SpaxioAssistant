/**
 * Team member permissions.
 * Owner always has full access; non-owners only have explicitly granted permissions.
 */

export const TEAM_PERMISSION_KEYS = [
  'view_dashboard',
  'manage_chatbot_settings',
  'manage_widget_settings',
  'view_leads',
  'manage_leads',
  'view_conversations',
  'manage_automations',
  'manage_integrations',
  'view_analytics',
  'manage_billing',
  'manage_team_members',
] as const;

export type TeamPermissionKey = (typeof TEAM_PERMISSION_KEYS)[number];

export type TeamPermissions = Record<TeamPermissionKey, boolean>;

export const DEFAULT_TEAM_PERMISSIONS: TeamPermissions = {
  view_dashboard: false,
  manage_chatbot_settings: false,
  manage_widget_settings: false,
  view_leads: false,
  manage_leads: false,
  view_conversations: false,
  manage_automations: false,
  manage_integrations: false,
  view_analytics: false,
  manage_billing: false,
  manage_team_members: false,
};

/** Permission labels for UI */
export const TEAM_PERMISSION_LABELS: Record<TeamPermissionKey, string> = {
  view_dashboard: 'View dashboard',
  manage_chatbot_settings: 'Manage chatbot settings',
  manage_widget_settings: 'Manage website/widget settings',
  view_leads: 'View leads',
  manage_leads: 'Manage leads',
  view_conversations: 'View conversations',
  manage_automations: 'Manage automations',
  manage_integrations: 'Manage integrations',
  view_analytics: 'View analytics',
  manage_billing: 'Manage billing',
  manage_team_members: 'Manage team members',
};

/** Role presets: permission sets for Admin, Manager, Support, Custom */
export const ROLE_PRESETS = {
  admin: {
    label: 'Admin',
    permissions: {
      ...DEFAULT_TEAM_PERMISSIONS,
      view_dashboard: true,
      manage_chatbot_settings: true,
      manage_widget_settings: true,
      view_leads: true,
      manage_leads: true,
      view_conversations: true,
      manage_automations: true,
      manage_integrations: true,
      view_analytics: true,
      manage_billing: false,
      manage_team_members: true,
    } as TeamPermissions,
  },
  manager: {
    label: 'Manager',
    permissions: {
      ...DEFAULT_TEAM_PERMISSIONS,
      view_dashboard: true,
      manage_chatbot_settings: true,
      manage_widget_settings: true,
      view_leads: true,
      manage_leads: true,
      view_conversations: true,
      manage_automations: false,
      manage_integrations: false,
      view_analytics: true,
      manage_billing: false,
      manage_team_members: false,
    } as TeamPermissions,
  },
  support: {
    label: 'Support',
    permissions: {
      ...DEFAULT_TEAM_PERMISSIONS,
      view_dashboard: true,
      manage_chatbot_settings: false,
      manage_widget_settings: false,
      view_leads: true,
      manage_leads: false,
      view_conversations: true,
      manage_automations: false,
      manage_integrations: false,
      view_analytics: false,
      manage_billing: false,
      manage_team_members: false,
    } as TeamPermissions,
  },
  custom: {
    label: 'Custom',
    permissions: DEFAULT_TEAM_PERMISSIONS,
  },
} as const;

export type RolePresetKey = keyof typeof ROLE_PRESETS;

/** Parse permissions from DB jsonb (may be partial). */
export function parsePermissions(value: unknown): TeamPermissions {
  const out = { ...DEFAULT_TEAM_PERMISSIONS };
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    for (const key of TEAM_PERMISSION_KEYS) {
      if (typeof obj[key] === 'boolean') out[key] = obj[key] as boolean;
    }
  }
  return out;
}

/** Serialize permissions for DB. */
export function serializePermissions(p: Partial<TeamPermissions>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of TEAM_PERMISSION_KEYS) {
    if (typeof p[key] === 'boolean') out[key] = p[key];
  }
  return out;
}

/** Check if user has a specific permission (caller must pass isOwner or resolved permissions). */
export function hasPermission(
  permission: TeamPermissionKey,
  opts: { isOwner: boolean; permissions?: TeamPermissions }
): boolean {
  if (opts.isOwner) return true;
  return opts.permissions?.[permission] === true;
}
