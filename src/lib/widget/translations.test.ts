import { describe, it, expect } from 'vitest';
import {
  normalizeLocale,
  getWidgetTranslation,
  WIDGET_TRANSLATIONS,
  DEFAULT_WELCOME,
} from './translations';

describe('normalizeLocale', () => {
  it('normalizes en-US to en', () => {
    expect(normalizeLocale('en-US')).toBe('en');
  });
  it('normalizes fr-CA to fr', () => {
    expect(normalizeLocale('fr-CA')).toBe('fr');
  });
  it('keeps 2-letter codes', () => {
    expect(normalizeLocale('en')).toBe('en');
    expect(normalizeLocale('fr')).toBe('fr');
  });
  it('handles empty/whitespace with en fallback', () => {
    expect(normalizeLocale('')).toBe('en');
    expect(normalizeLocale('  ')).toBe('en');
  });
  it('trims and lowercases', () => {
    expect(normalizeLocale('  EN  ')).toBe('en');
  });
});

describe('getWidgetTranslation', () => {
  it('returns English for en', () => {
    expect(getWidgetTranslation('en', 'placeholder')).toBe('Type a message...');
    expect(getWidgetTranslation('en', 'welcomeMessage')).toBe(DEFAULT_WELCOME);
  });
  it('returns French for fr', () => {
    expect(getWidgetTranslation('fr', 'placeholder')).toBe('Écrivez un message...');
    expect(getWidgetTranslation('fr', 'send')).toBe('Envoyer');
  });
  it('falls back to English for missing key in locale', () => {
    expect(getWidgetTranslation('xx', 'placeholder')).toBe('Type a message...');
  });
  it('uses custom override when provided', () => {
    const custom = { en: { placeholder: 'Custom placeholder' } };
    expect(getWidgetTranslation('en', 'placeholder', custom)).toBe('Custom placeholder');
  });
  it('custom override for fr', () => {
    const custom = { fr: { errorMessage: 'Erreur personnalisée' } };
    expect(getWidgetTranslation('fr', 'errorMessage', custom)).toBe('Erreur personnalisée');
  });
  it('unknown locale falls back to English', () => {
    expect(getWidgetTranslation('xx', 'welcomeMessage')).toBe(DEFAULT_WELCOME);
  });
});

describe('default dictionaries', () => {
  it('has en, fr, es, de, pt, it', () => {
    expect(Object.keys(WIDGET_TRANSLATIONS)).toEqual(
      expect.arrayContaining(['en', 'fr', 'es', 'de', 'pt', 'it'])
    );
  });
  it('all locales have required keys', () => {
    const keys = [
      'welcomeMessage',
      'placeholder',
      'send',
      'typingIndicator',
      'errorMessage',
      'chatTab',
      'voiceTab',
      'close',
      'poweredBy',
    ] as const;
    for (const lang of Object.keys(WIDGET_TRANSLATIONS)) {
      for (const key of keys) {
        const val = (WIDGET_TRANSLATIONS[lang] as Record<string, string>)[key];
        expect(val, `${lang}.${key}`).toBeDefined();
        expect(typeof val).toBe('string');
        expect(val.length).toBeGreaterThan(0);
      }
    }
  });
});
