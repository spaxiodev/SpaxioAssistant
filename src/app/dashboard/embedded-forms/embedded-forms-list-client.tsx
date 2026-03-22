'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from '@/components/intl-link';
import {
  Plus,
  MoreHorizontal,
  FileCode,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Inbox,
  ClipboardList,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

type EmbeddedFormSummary = {
  id: string;
  name: string;
  form_type: string;
  is_active: boolean;
  created_at: string;
  submission_count: number;
};

const FORM_TYPE_LABELS: Record<string, string> = {
  lead_form: 'Lead Form',
  quote_form: 'Quote Form',
  custom_request_form: 'Request Form',
};

type Props = {
  initialForms: EmbeddedFormSummary[];
};

export function EmbeddedFormsListClient({ initialForms }: Props) {
  const router = useRouter();
  const [forms, setForms] = useState(initialForms);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<string>('lead_form');
  const [createError, setCreateError] = useState('');

  async function handleCreate() {
    if (!newName.trim()) {
      setCreateError('Form name is required');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/dashboard/embedded-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), form_type: newType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create form');
      setCreateOpen(false);
      setNewName('');
      setNewType('lead_form');
      router.push(`/dashboard/embedded-forms/${data.form.id}`);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create form');
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/dashboard/embedded-forms/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    });
    if (res.ok) {
      setForms((prev) => prev.map((f) => (f.id === id ? { ...f, is_active: !current } : f)));
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/dashboard/embedded-forms/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setForms((prev) => prev.filter((f) => f.id !== id));
        setDeleteId(null);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Embedded Forms</h1>
          <p className="mt-1 text-muted-foreground">
            Create forms and embed them on any page of your website. Submissions are saved here.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New form
        </Button>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <ClipboardList className="h-10 w-10 text-primary" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">No forms yet</h2>
            <p className="mb-6 max-w-sm text-sm text-muted-foreground">
              Create your first form to embed on your website. Collect leads, get quote requests, or gather any information from visitors.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first form
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your Forms</CardTitle>
            <CardDescription>
              Click a form to edit it, build fields, get the embed code, and view submissions.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {forms.map((form) => (
                <li
                  key={form.id}
                  className="flex flex-col gap-3 px-6 py-4 first:rounded-t-lg last:rounded-b-lg sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileCode className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/embedded-forms/${form.id}`}
                        className="block truncate font-medium hover:text-primary"
                      >
                        {form.name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {FORM_TYPE_LABELS[form.form_type] ?? form.form_type} · Created {formatDate(form.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={form.is_active ? 'default' : 'secondary'} className={form.is_active ? 'bg-green-600 hover:bg-green-700' : ''}>
                      {form.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Inbox className="h-4 w-4" />
                      {form.submission_count} {form.submission_count === 1 ? 'submission' : 'submissions'}
                    </span>
                    <Link href={`/dashboard/embedded-forms/${form.id}`}>
                      <Button variant="outline" size="sm">
                        <Edit className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">More options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(form.id, form.is_active)}
                          className="cursor-pointer"
                        >
                          {form.is_active ? (
                            <><ToggleLeft className="mr-2 h-4 w-4" />Deactivate</>
                          ) : (
                            <><ToggleRight className="mr-2 h-4 w-4" />Activate</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteId(form.id)}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete form
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) { setNewName(''); setCreateError(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new form</DialogTitle>
            <DialogDescription>
              Give your form a name and choose a type. You can add fields and configure everything after.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="form-name">Form name</Label>
              <Input
                id="form-name"
                className="mt-1"
                placeholder="e.g. Contact Form, Get a Quote"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="form-type">Form type</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger id="form-type" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead_form">Lead Form — capture contact info and inquiries</SelectItem>
                  <SelectItem value="quote_form">Quote Form — collect details and calculate an estimate</SelectItem>
                  <SelectItem value="custom_request_form">Request Form — custom fields for any request type</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? 'Creating…' : 'Create form'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this form?</DialogTitle>
            <DialogDescription>
              This will permanently delete the form, all its fields, and all submissions. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
