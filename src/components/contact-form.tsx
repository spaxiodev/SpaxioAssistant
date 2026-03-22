'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function ContactForm() {
  const locale = useLocale();
  const t = useTranslations('home');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setErrorMessage('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          locale,
          browserLocale: typeof navigator !== 'undefined' ? navigator.language : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setErrorMessage(data.error || t('contactFormError'));
        return;
      }
      setStatus('success');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch {
      setStatus('error');
      setErrorMessage(t('contactFormError'));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4 border-t border-border pt-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-name">{t('contactFormName')}</Label>
          <Input
            id="contact-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('contactFormNamePlaceholder')}
            required
            disabled={status === 'sending'}
            autoComplete="name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-email">{t('contactFormEmail')}</Label>
          <Input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('contactFormEmailPlaceholder')}
            required
            disabled={status === 'sending'}
            autoComplete="email"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-subject">{t('contactFormSubject')}</Label>
        <Input
          id="contact-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t('contactFormSubjectPlaceholder')}
          disabled={status === 'sending'}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact-message">{t('contactFormMessage')}</Label>
        <Textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('contactFormMessagePlaceholder')}
          required
          rows={4}
          disabled={status === 'sending'}
        />
      </div>
      {status === 'success' && (
        <p className="text-sm font-medium text-green-600 dark:text-green-400">
          {t('contactFormSuccess')}
        </p>
      )}
      {status === 'error' && (
        <p className="text-sm font-medium text-destructive">{errorMessage}</p>
      )}
      <Button type="submit" disabled={status === 'sending'} className="rounded-full">
        {status === 'sending' ? t('contactFormSending') : t('contactFormSubmit')}
      </Button>
    </form>
  );
}
