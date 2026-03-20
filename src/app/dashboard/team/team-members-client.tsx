'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { UserPlus, MoreHorizontal, Mail } from 'lucide-react';
import {
  TEAM_PERMISSION_KEYS,
  TEAM_PERMISSION_LABELS,
  ROLE_PRESETS,
  type TeamPermissions,
  type RolePresetKey,
} from '@/lib/team-permissions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Member = {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  role_label: string | null;
  permissions: Record<string, boolean>;
  invited_by_name: string | null;
  created_at: string;
  is_owner: boolean;
};

type Invitation = {
  id: string;
  email: string;
  role_label: string | null;
  permissions: Record<string, boolean>;
  invited_by_name: string | null;
  expires_at: string;
  created_at: string;
};

export function TeamMembersClient({ canInvite = true }: { canInvite?: boolean }) {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleLabel, setInviteRoleLabel] = useState('');
  const [invitePreset, setInvitePreset] = useState<RolePresetKey>('custom');
  const [invitePermissions, setInvitePermissions] = useState<TeamPermissions>({ ...ROLE_PRESETS.custom.permissions });
  const [sending, setSending] = useState(false);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<TeamPermissions | null>(null);
  const [editRoleLabel, setEditRoleLabel] = useState('');
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [removeMemberName, setRemoveMemberName] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, invRes] = await Promise.all([
        fetch('/api/team/members'),
        fetch('/api/team/invitations'),
      ]);
      const membersData = await membersRes.json();
      const invData = await invRes.json();
      if (membersData.members) setMembers(membersData.members);
      if (invData.invitations) setInvitations(invData.invitations);
    } catch {
      toast({ title: t('error'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const preset = ROLE_PRESETS[invitePreset];
    setInvitePermissions(preset ? { ...preset.permissions } : { ...ROLE_PRESETS.custom.permissions });
    if (preset && preset.label !== 'Custom') setInviteRoleLabel(preset.label);
  }, [invitePreset]);

  async function handleSendInvite(e: React.FormEvent) {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setSending(true);
    try {
      const res = await fetch('/api/team/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          role_label: inviteRoleLabel.trim() || null,
          permissions: invitePermissions,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || t('inviteFailed'), variant: 'destructive' });
        return;
      }
      if (data.invitation?.email_sent) {
        toast({ title: t('inviteSent', { email }) });
      } else {
        toast({
          title: t('inviteCreatedEmailNotSent'),
          description: data.invitation?.email_error,
          variant: 'destructive',
        });
      }
      setInviteEmail('');
      setInviteRoleLabel('');
      setInvitePreset('custom');
      setInvitePermissions({ ...ROLE_PRESETS.custom.permissions });
      fetchData();
    } catch {
      toast({ title: t('inviteFailed'), variant: 'destructive' });
    } finally {
      setSending(false);
    }
  }

  async function handleResend(invitationId: string) {
    try {
      const res = await fetch('/api/team/invitations/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitation_id: invitationId, locale }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || t('inviteFailed'), variant: 'destructive' });
        return;
      }
      if (data.email_sent) {
        toast({ title: t('inviteResent') });
      } else {
        toast({
          title: t('inviteCreatedEmailNotSent'),
          description: data.error_message,
          variant: 'destructive',
        });
      }
      fetchData();
    } catch {
      toast({ title: 'Failed to resend', variant: 'destructive' });
    }
  }

  async function handleRevoke(invitationId: string) {
    try {
      const res = await fetch('/api/team/invitations/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitation_id: invitationId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: data.error || 'Failed to revoke', variant: 'destructive' });
        return;
      }
      toast({ title: t('inviteRevoked') });
      fetchData();
    } catch {
      toast({ title: 'Failed to revoke', variant: 'destructive' });
    }
  }

  async function handleUpdateMember() {
    if (!editMemberId || !editPermissions) return;
    try {
      const res = await fetch(`/api/team/members/${editMemberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: editPermissions, role_label: editRoleLabel || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: data.error || 'Failed to update', variant: 'destructive' });
        return;
      }
      toast({ title: t('memberUpdated') });
      setEditMemberId(null);
      setEditPermissions(null);
      setEditRoleLabel('');
      fetchData();
    } catch {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  }

  async function handleRemoveMember() {
    if (!removeMemberId) return;
    try {
      const res = await fetch(`/api/team/members/${removeMemberId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: data.error || 'Failed to remove', variant: 'destructive' });
        return;
      }
      toast({ title: t('memberRemoved') });
      setRemoveMemberId(null);
      setRemoveMemberName('');
      fetchData();
    } catch {
      toast({ title: 'Failed to remove', variant: 'destructive' });
    }
  }

  function openEdit(m: Member) {
    if (m.is_owner) return;
    setEditMemberId(m.id);
    setEditRoleLabel(m.role_label ?? '');
    setEditPermissions({ ...m.permissions } as TeamPermissions);
  }

  function permissionSummary(permissions: Record<string, boolean>): string {
    const count = Object.values(permissions).filter(Boolean).length;
    if (count === 0) return 'No access';
    if (count >= TEAM_PERMISSION_KEYS.length - 1) return 'Full access';
    return `${count} permissions`;
  }

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleDateString(undefined, { dateStyle: 'medium' });
    } catch {
      return s;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5" />
            {t('inviteTeamMember')}
          </CardTitle>
          <CardDescription>
            {canInvite
              ? 'Enter an email and set permissions. They will receive an invite link (valid 7 days).'
              : "You've reached the team member limit for your current plan. Upgrade to invite more teammates."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvite} className="space-y-4" aria-disabled={!canInvite}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="invite-email">{t('emailLabel')}</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t('roleLabel')}</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={invitePreset}
                  onChange={(e) => setInvitePreset(e.target.value as RolePresetKey)}
                >
                  {(['admin', 'manager', 'support', 'custom'] as const).map((key) => (
                    <option key={key} value={key}>
                      {t(`rolePreset${key.charAt(0).toUpperCase() + key.slice(1)}`)}
                    </option>
                  ))}
                </select>
                <Input
                  className="mt-2"
                  placeholder={t('roleLabelPlaceholder')}
                  value={inviteRoleLabel}
                  onChange={(e) => setInviteRoleLabel(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('permissions')}</Label>
              <div className="grid gap-2 rounded-lg border border-border/50 p-3 sm:grid-cols-2">
                {TEAM_PERMISSION_KEYS.map((key) => (
                  <div key={key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`invite-${key}`}
                      className="h-4 w-4 rounded border-input"
                      checked={invitePermissions[key] ?? false}
                      onChange={(e) =>
                        setInvitePermissions((p) => ({ ...p, [key]: e.target.checked }))
                      }
                    />
                    <label
                      htmlFor={`invite-${key}`}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {TEAM_PERMISSION_LABELS[key]}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={sending || !canInvite}>
              {sending ? t('sending') : t('sendInvite')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('currentMembers')}</CardTitle>
          <CardDescription>People who have access to this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>{t('joined')}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {t('noMembers')}
                  </TableCell>
                </TableRow>
              ) : (
                members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.full_name || m.email || '—'}
                      {m.is_owner && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Owner
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.email ?? '—'}</TableCell>
                    <TableCell>{m.role_label || m.role}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.is_owner ? 'Full access' : permissionSummary(m.permissions)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(m.created_at)}</TableCell>
                    <TableCell>
                      {!m.is_owner && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(m)}>
                              {t('editPermissions')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                              onClick={() => {
                                setRemoveMemberId(m.id);
                                setRemoveMemberName(m.full_name || m.email || 'this member');
                              }}
                            >
                              {t('removeMember')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t('pendingInvitations')}
          </CardTitle>
          <CardDescription>Invitations that haven&apos;t been accepted yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>{t('invitedBy')}</TableHead>
                <TableHead>{t('sent')}</TableHead>
                <TableHead>{t('expires')}</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {t('noPendingInvites')}
                  </TableCell>
                </TableRow>
              ) : (
                invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>{inv.role_label ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {permissionSummary(inv.permissions)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{inv.invited_by_name ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(inv.created_at)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(inv.expires_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResend(inv.id)}
                        >
                          {t('resendInvite')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleRevoke(inv.id)}
                        >
                          {t('revokeInvite')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editMemberId} onOpenChange={(open) => !open && setEditMemberId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editPermissions')}</DialogTitle>
            <DialogDescription>Update role label and permissions for this member.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('roleLabel')}</Label>
              <Input
                value={editRoleLabel}
                onChange={(e) => setEditRoleLabel(e.target.value)}
                placeholder={t('roleLabelPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('permissions')}</Label>
              <div className="grid gap-2 rounded-lg border border-border/50 p-3 sm:grid-cols-2">
                {editPermissions &&
                  TEAM_PERMISSION_KEYS.map((key) => (
                    <div key={key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`edit-${key}`}
                        className="h-4 w-4 rounded border-input"
                        checked={editPermissions[key] ?? false}
                        onChange={(e) =>
                          setEditPermissions((p) => (p ? { ...p, [key]: e.target.checked } : null))
                        }
                      />
                      <label htmlFor={`edit-${key}`} className="text-sm leading-none cursor-pointer">
                        {TEAM_PERMISSION_LABELS[key]}
                      </label>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMemberId(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMember}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeMemberId} onOpenChange={(open) => !open && setRemoveMemberId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('removeMember')}</DialogTitle>
            <DialogDescription>
              {t('removeMemberConfirm', { name: removeMemberName })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveMemberId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember}>
              {t('removeMember')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
