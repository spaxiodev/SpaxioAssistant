'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  GripVertical,
  Trash2,
  ChevronUp,
  ChevronDown,
  Settings,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';
import type { EmbeddedForm, FormField, FormFieldInput, FieldType, FormType } from '@/lib/embedded-forms/types';

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'textarea', label: 'Text area (long)' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown' },
  { value: 'radio', label: 'Radio (single choice)' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
];

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text',
  email: 'Email',
  phone: 'Phone',
  textarea: 'Text area',
  number: 'Number',
  select: 'Dropdown',
  radio: 'Radio',
  checkbox: 'Checkbox',
  date: 'Date',
};

type PricingProfile = { id: string; name: string };

type Props = {
  form: EmbeddedForm;
  pricingProfiles: PricingProfile[];
  onFormUpdated: (form: EmbeddedForm) => void;
};

function toFieldInput(f: FormField): FormFieldInput {
  return {
    id: f.id,
    field_key: f.field_key,
    label: f.label,
    field_type: f.field_type,
    placeholder: f.placeholder ?? '',
    required: f.required,
    options_json: f.options_json ?? [],
    sort_order: f.sort_order,
    pricing_mapping_json: f.pricing_mapping_json ?? {},
  };
}

function generateKey(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 50) || `field_${Date.now()}`;
}

/** Trim and drop blank lines for persisted options (editing uses raw lines so spaces/newlines work). */
function normalizeChoiceOptions(lines: string[]) {
  return lines.map((s) => s.trim()).filter((s) => s.length > 0);
}

export function EmbeddedFormBuilderClient({ form, pricingProfiles, onFormUpdated }: Props) {
  const [settings, setSettings] = useState({
    name: form.name,
    form_type: form.form_type,
    is_active: form.is_active,
    success_message: form.success_message ?? '',
    pricing_profile_id: form.pricing_profile_id ?? '',
  });
  const [fields, setFields] = useState<FormFieldInput[]>((form.fields ?? []).map(toFieldInput));
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Field edit dialog state
  const [editFieldIdx, setEditFieldIdx] = useState<number | null>(null);
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [newFieldType, setNewFieldType] = useState<FieldType>('text');
  const [newFieldLabel, setNewFieldLabel] = useState('');

  const editingField = editFieldIdx !== null ? fields[editFieldIdx] : null;

  function addField() {
    if (!newFieldLabel.trim()) return;
    const key = generateKey(newFieldLabel);
    const newField: FormFieldInput = {
      field_key: key,
      label: newFieldLabel.trim(),
      field_type: newFieldType,
      placeholder: '',
      required: false,
      options_json: ['select', 'radio'].includes(newFieldType) ? ['Option 1', 'Option 2'] : [],
      sort_order: fields.length,
    };
    setFields((prev) => [...prev, newField]);
    setAddFieldOpen(false);
    setNewFieldLabel('');
    setNewFieldType('text');
    // Open edit dialog for the new field
    setEditFieldIdx(fields.length);
  }

  function removeField(idx: number) {
    setFields((prev) => prev.filter((_, i) => i !== idx).map((f, i) => ({ ...f, sort_order: i })));
  }

  function moveField(idx: number, dir: 'up' | 'down') {
    const next = [...fields];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target]!, next[idx]!];
    setFields(next.map((f, i) => ({ ...f, sort_order: i })));
  }

  function updateEditingField(patch: Partial<FormFieldInput>) {
    if (editFieldIdx === null) return;
    setFields((prev) => prev.map((f, i) => (i === editFieldIdx ? { ...f, ...patch } : f)));
  }

  async function handleSave() {
    setSaving(true);
    setSaveStatus('idle');
    try {
      const res = await fetch(`/api/dashboard/embedded-forms/${form.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: settings.name,
          form_type: settings.form_type,
          is_active: settings.is_active,
          success_message: settings.success_message || null,
          pricing_profile_id: settings.pricing_profile_id || null,
          fields: fields.map((f, i) => ({
            ...f,
            sort_order: i,
            ...(f.field_type === 'select' || f.field_type === 'radio'
              ? { options_json: normalizeChoiceOptions(f.options_json ?? []) }
              : {}),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');
      setSaveStatus('saved');
      onFormUpdated(data.form);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Form Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Form Settings</CardTitle>
          <CardDescription>Basic configuration for this form.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="form-name">Form name</Label>
              <Input
                id="form-name"
                className="mt-1"
                value={settings.name}
                onChange={(e) => setSettings((s) => ({ ...s, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="form-type">Form type</Label>
              <Select
                value={settings.form_type}
                onValueChange={(v) => setSettings((s) => ({ ...s, form_type: v as FormType }))}
              >
                <SelectTrigger id="form-type" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead_form">Lead Form</SelectItem>
                  <SelectItem value="quote_form">Quote Form</SelectItem>
                  <SelectItem value="custom_request_form">Request Form</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {settings.form_type === 'quote_form' && (
            <div>
              <Label htmlFor="pricing-profile">Pricing profile (optional)</Label>
              <Select
                value={settings.pricing_profile_id || '_none'}
                onValueChange={(v) => setSettings((s) => ({ ...s, pricing_profile_id: v === '_none' ? '' : v }))}
              >
                <SelectTrigger id="pricing-profile" className="mt-1">
                  <SelectValue placeholder="None — no estimate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None — collect without estimate</SelectItem>
                  {pricingProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Link a pricing profile to calculate estimates when the form is submitted.
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="success-msg">Success message</Label>
            <Textarea
              id="success-msg"
              className="mt-1"
              rows={2}
              placeholder="Thank you! We'll be in touch shortly."
              value={settings.success_message}
              onChange={(e) => setSettings((s) => ({ ...s, success_message: e.target.value }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Form active</Label>
              <p className="text-xs text-muted-foreground">
                Inactive forms return an error when visited.
              </p>
            </div>
            <Switch
              checked={settings.is_active}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, is_active: v }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Fields */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Form Fields</CardTitle>
            <CardDescription>
              {fields.length === 0
                ? 'No fields yet. Add fields to build your form.'
                : `${fields.length} field${fields.length === 1 ? '' : 's'}. Click to edit.`}
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setAddFieldOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add field
          </Button>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <div className="rounded-lg border border-dashed border-muted-foreground/25 p-8 text-center">
              <p className="text-sm text-muted-foreground">No fields yet.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setAddFieldOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add your first field
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {fields.map((field, idx) => (
                <li
                  key={field.field_key + idx}
                  className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5"
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{field.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {FIELD_TYPE_LABELS[field.field_type] ?? field.field_type}
                      {field.required && <Badge variant="secondary" className="ml-1.5 py-0 text-[10px]">Required</Badge>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveField(idx, 'up')} disabled={idx === 0} aria-label="Move up">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveField(idx, 'down')} disabled={idx === fields.length - 1} aria-label="Move down">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="cursor-pointer" onClick={() => setEditFieldIdx(idx)}>
                          <Settings className="mr-2 h-4 w-4" />
                          Edit field
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer text-destructive focus:text-destructive"
                          onClick={() => removeField(idx)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saving ? 'Saving…' : 'Save form'}
        </Button>
        {saveStatus === 'saved' && <p className="text-sm text-green-600 dark:text-green-400">Saved successfully.</p>}
        {saveStatus === 'error' && <p className="text-sm text-destructive">Failed to save. Please try again.</p>}
      </div>

      {/* Add field dialog */}
      <Dialog open={addFieldOpen} onOpenChange={(o) => { setAddFieldOpen(o); if (!o) { setNewFieldLabel(''); setNewFieldType('text'); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a field</DialogTitle>
            <DialogDescription>Choose a field type and give it a label.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="new-field-type">Field type</Label>
              <Select value={newFieldType} onValueChange={(v) => setNewFieldType(v as FieldType)}>
                <SelectTrigger id="new-field-type" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="new-field-label">Label</Label>
              <Input
                id="new-field-label"
                className="mt-1"
                placeholder="e.g. Your name, Service needed"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addField()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFieldOpen(false)}>Cancel</Button>
            <Button onClick={addField} disabled={!newFieldLabel.trim()}>Add field</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit field dialog */}
      <Dialog open={editFieldIdx !== null} onOpenChange={(o) => !o && setEditFieldIdx(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit field</DialogTitle>
            <DialogDescription>Configure this field's label, placeholder, and options.</DialogDescription>
          </DialogHeader>
          {editingField && (
            <div className="space-y-4 py-2">
              <div>
                <Label>Field type</Label>
                <Select
                  value={editingField.field_type}
                  onValueChange={(v) => updateEditingField({ field_type: v as FieldType })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Label</Label>
                <Input
                  className="mt-1"
                  value={editingField.label}
                  onChange={(e) => updateEditingField({ label: e.target.value })}
                />
              </div>
              <div>
                <Label>Field key (internal)</Label>
                <Input
                  className="mt-1 font-mono text-xs"
                  value={editingField.field_key}
                  onChange={(e) => updateEditingField({ field_key: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') })}
                />
                <p className="mt-1 text-xs text-muted-foreground">Used in answer data. Must be unique.</p>
              </div>
              {editingField.field_type !== 'checkbox' && editingField.field_type !== 'radio' && editingField.field_type !== 'select' && editingField.field_type !== 'date' && (
                <div>
                  <Label>Placeholder</Label>
                  <Input
                    className="mt-1"
                    value={editingField.placeholder ?? ''}
                    onChange={(e) => updateEditingField({ placeholder: e.target.value })}
                  />
                </div>
              )}
              {['select', 'radio'].includes(editingField.field_type) && (
                <div>
                  <Label>Options (one per line)</Label>
                  <Textarea
                    className="mt-1 font-mono text-xs whitespace-pre-wrap"
                    rows={5}
                    value={(editingField.options_json ?? []).join('\n')}
                    onChange={(e) =>
                      updateEditingField({
                        options_json: e.target.value.split('\n'),
                      })
                    }
                    placeholder={'Option 1\nOption 2\nOption 3'}
                  />
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Required</p>
                  <p className="text-xs text-muted-foreground">Visitors must fill this field before submitting.</p>
                </div>
                <Switch
                  checked={editingField.required}
                  onCheckedChange={(v) => updateEditingField({ required: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setEditFieldIdx(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
