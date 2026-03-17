'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Building2, Check, Pencil, Trash2 } from 'lucide-react';

export type OrganizationOption = {
  id: string;
  name: string;
  business_name: string | null;
  display_name: string;
  is_owner: boolean;
  is_current: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ManageBusinessesDialog({ open, onOpenChange }: Props) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState('');
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [cleanupInProgress, setCleanupInProgress] = useState(false);

  const ownedCount = organizations.filter((o) => o.is_owner).length;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/organization/list')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.organizations)) setOrganizations(data.organizations);
      })
      .finally(() => setLoading(false));
  }, [open]);

  async function handleSwitch(orgId: string) {
    const org = organizations.find((o) => o.id === orgId);
    if (org?.is_current) return;
    try {
      const res = await fetch('/api/organization/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: orgId }),
      });
      if (res.ok) {
        onOpenChange(false);
        router.refresh();
      }
    } catch {
      toast({ title: t('addBusinessError'), variant: 'destructive' });
    }
  }

  function startRename(org: OrganizationOption) {
    setRenameId(org.id);
    setRenameName(org.display_name);
  }

  async function saveRename() {
    if (!renameId || !renameName.trim()) return;
    setRenameSaving(true);
    try {
      const res = await fetch('/api/organization/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: renameId, name: renameName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || t('addBusinessError'), variant: 'destructive' });
        return;
      }
      setOrganizations((prev) =>
        prev.map((o) =>
          o.id === renameId
            ? {
                ...o,
                name: renameName.trim(),
                business_name: renameName.trim(),
                display_name: renameName.trim(),
              }
            : o
        )
      );
      setRenameId(null);
      setRenameName('');
      toast({ title: t('businessRenamed') });
      router.refresh();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('businesses-updated'));
    } catch {
      toast({ title: t('addBusinessError'), variant: 'destructive' });
    } finally {
      setRenameSaving(false);
    }
  }

  function startDelete(org: OrganizationOption) {
    setDeleteId(org.id);
    setDeleteName(org.display_name);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleteConfirming(true);
    try {
      const res = await fetch('/api/organization/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: deleteId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || t('addBusinessError'), variant: 'destructive' });
        return;
      }
      setOrganizations((prev) => prev.filter((o) => o.id !== deleteId));
      setDeleteId(null);
      setDeleteName('');
      onOpenChange(false);
      toast({ title: t('businessDeleted') });
      if (data.was_current) router.refresh();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('businesses-updated'));
    } catch {
      toast({ title: t('addBusinessError'), variant: 'destructive' });
    } finally {
      setDeleteConfirming(false);
    }
  }

  const canDeleteAny = ownedCount > 1;

  async function handleCleanupDuplicates() {
    if (ownedCount <= 2) return;
    setCleanupInProgress(true);
    try {
      const res = await fetch('/api/organization/cleanup-duplicates', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || t('addBusinessError'), variant: 'destructive' });
        return;
      }
      if (data.deleted > 0) {
        setLoading(true);
        const listRes = await fetch('/api/organization/list');
        const listData = await listRes.json();
        if (Array.isArray(listData.organizations)) setOrganizations(listData.organizations);
        setLoading(false);
        toast({ title: t('cleanupDuplicatesDone', { count: data.deleted }) });
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('businesses-updated'));
        if (data.was_current_cleared) {
          onOpenChange(false);
          router.refresh();
        }
      }
    } catch {
      toast({ title: t('addBusinessError'), variant: 'destructive' });
    } finally {
      setCleanupInProgress(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent showClose className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('manageBusinesses')}</DialogTitle>
            <DialogDescription>{t('manageBusinessesDescription')}</DialogDescription>
          </DialogHeader>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t('loading')}</p>
          ) : (
            <div className="space-y-2 py-2">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2"
                >
                  {renameId === org.id ? (
                    <div className="flex flex-1 flex-col gap-2 py-1">
                      <Label className="text-xs">{t('renameBusinessLabel')}</Label>
                      <div className="flex gap-2">
                        <Input
                          value={renameName}
                          onChange={(e) => setRenameName(e.target.value)}
                          maxLength={120}
                          className="h-8"
                        />
                        <Button size="sm" onClick={saveRename} disabled={renameSaving || !renameName.trim()}>
                          {t('save')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setRenameId(null); setRenameName(''); }}>
                          {t('cancel')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate font-medium">{org.display_name}</span>
                        {org.is_current && <Check className="h-4 w-4 shrink-0 text-primary" />}
                        <span className="shrink-0 text-muted-foreground text-xs" aria-hidden>
                          · {org.is_owner ? t('businessSwitcherYourBusiness') : t('businessSwitcherTeam')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {!org.is_current && (
                          <Button size="sm" variant="outline" onClick={() => handleSwitch(org.id)}>
                            {t('switchToBusiness')}
                          </Button>
                        )}
                        {org.is_owner && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => startRename(org)} aria-label={t('renameBusiness')}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {canDeleteAny && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => startDelete(org)}
                                aria-label={t('deleteBusiness')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          {!loading && ownedCount > 2 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="text-sm font-medium">{t('cleanupDuplicates')}</p>
              <p className="mt-1 text-muted-foreground text-xs">{t('cleanupDuplicatesDescription')}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 border-amber-500/50"
                onClick={handleCleanupDuplicates}
                disabled={cleanupInProgress}
              >
                {cleanupInProgress ? t('loading') : t('cleanupDuplicatesButton')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent showClose>
          <DialogHeader>
            <DialogTitle>{t('deleteBusiness')}</DialogTitle>
            <DialogDescription>
              {t('deleteBusinessConfirm', { name: deleteName || '' })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleteConfirming}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteConfirming}
            >
              {deleteConfirming ? t('loading') : t('deleteBusiness')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
