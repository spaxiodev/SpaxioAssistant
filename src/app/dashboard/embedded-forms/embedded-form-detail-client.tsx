'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmbeddedFormBuilderClient } from './embedded-form-builder-client';
import { EmbeddedFormSubmissionsClient } from './embedded-form-submissions-client';
import { EmbeddedFormEmbedCodeClient } from './embedded-form-embed-code-client';
import type { EmbeddedForm, FormSubmission } from '@/lib/embedded-forms/types';

type PricingProfile = { id: string; name: string };

type Props = {
  form: EmbeddedForm;
  pricingProfiles: PricingProfile[];
  initialSubmissions: FormSubmission[];
  baseUrl: string;
};

export function EmbeddedFormDetailClient({ form: initialForm, pricingProfiles, initialSubmissions, baseUrl }: Props) {
  const [form, setForm] = useState(initialForm);
  const [submissions, setSubmissions] = useState(initialSubmissions);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{form.name}</h1>
        <p className="text-muted-foreground">
          {form.form_type === 'lead_form' && 'Lead Form'}
          {form.form_type === 'quote_form' && 'Quote Form'}
          {form.form_type === 'custom_request_form' && 'Request Form'}
          {' · '}
          {form.is_active ? (
            <span className="text-green-600 dark:text-green-400">Active</span>
          ) : (
            <span className="text-muted-foreground">Inactive</span>
          )}
        </p>
      </div>

      <Tabs defaultValue="builder">
        <TabsList>
          <TabsTrigger value="builder">Form Builder</TabsTrigger>
          <TabsTrigger value="submissions">
            Submissions
            {submissions.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/20 px-1.5 py-0.5 text-xs font-medium text-primary">
                {submissions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="embed">Embed Code</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="mt-6">
          <EmbeddedFormBuilderClient
            form={form}
            pricingProfiles={pricingProfiles}
            onFormUpdated={setForm}
          />
        </TabsContent>

        <TabsContent value="submissions" className="mt-6">
          <EmbeddedFormSubmissionsClient
            formId={form.id}
            formName={form.name}
            initialSubmissions={submissions}
            onSubmissionsUpdated={setSubmissions}
          />
        </TabsContent>

        <TabsContent value="embed" className="mt-6">
          <EmbeddedFormEmbedCodeClient
            formId={form.id}
            formName={form.name}
            isActive={form.is_active}
            baseUrl={baseUrl}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
