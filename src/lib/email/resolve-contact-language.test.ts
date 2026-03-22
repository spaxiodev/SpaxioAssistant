import { describe, expect, it } from 'vitest';
import { resolveContactConfirmationLanguage } from './resolve-contact-language';

describe('resolveContactConfirmationLanguage', () => {
  it('uses website locale when message is too short to detect', () => {
    expect(
      resolveContactConfirmationLanguage({ locale: 'fr' }, 'ok')
    ).toBe('fr');
  });

  it('uses French locale for French site', () => {
    expect(
      resolveContactConfirmationLanguage(
        { locale: 'fr' },
        'Bonjour, je vous écris pour avoir des informations sur votre produit et les tarifs applicables à notre entreprise.'
      )
    ).toBe('fr');
  });

  it('switches to French when the UI is English but the message is clearly French', () => {
    expect(
      resolveContactConfirmationLanguage(
        { locale: 'en' },
        'Bonjour, je souhaite vous contacter concernant une démonstration de votre solution. Merci beaucoup pour votre retour rapide.'
      )
    ).toBe('fr');
  });

  it('keeps English when the site is English and the message is English', () => {
    expect(
      resolveContactConfirmationLanguage(
        { locale: 'en' },
        'Hello, I would like to learn more about your product and pricing for our small business. Thank you very much for your time.'
      )
    ).toBe('en');
  });
});
