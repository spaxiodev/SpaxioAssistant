import { describe, it, expect } from 'vitest';
import { buildLanguageInstruction } from './prompt';

describe('buildLanguageInstruction', () => {
  it('returns null when activeLocale is empty', () => {
    expect(buildLanguageInstruction({ activeLocale: '' })).toBeNull();
  });

  it('returns instruction for activeLocale', () => {
    const out = buildLanguageInstruction({ activeLocale: 'fr' });
    expect(out).toContain('French');
    expect(out).toContain('"fr"');
    expect(out).toContain('MUST respond in this language');
  });

  it('includes supported list when provided', () => {
    const out = buildLanguageInstruction({
      activeLocale: 'es',
      supportedLanguages: ['en', 'es', 'fr'],
    });
    expect(out).toContain('en, es, fr');
    expect(out).toContain('"es"');
  });

  it('returns null when matchAIResponseToWebsiteLanguage is false', () => {
    expect(
      buildLanguageInstruction({
        activeLocale: 'fr',
        matchAIResponseToWebsiteLanguage: false,
      })
    ).toBeNull();
  });

  it('never answer outside supported list', () => {
    const out = buildLanguageInstruction({
      activeLocale: 'en',
      supportedLanguages: ['en', 'fr'],
    });
    expect(out).toContain('NEVER');
    expect(out).toContain('supported');
  });
});
