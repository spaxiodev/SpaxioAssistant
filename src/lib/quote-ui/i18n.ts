/**
 * Centralized quote form / quote success copy for the widget and AI Page Assistant.
 * English and French are the canonical locales (single source of truth for parity).
 * Other widget locales fall back to existing widget dictionary strings via widgetT().
 */

import type { WidgetTranslationKey } from '@/lib/widget/translations';
import { normalizeLocale, type CustomTranslations } from '@/lib/widget/translations';

export type QuoteUiStrings = {
  quoteFormTitle: string;
  backToChat: string;
  name: string;
  email: string;
  phone: string;
  /** Full label e.g. "Phone (optional)" */
  phoneOptionalFull: string;
  /** Shown after phone label when not using phoneOptionalFull */
  optionalInParens: string;
  yes: string;
  no: string;
  calculateAndSubmit: string;
  calculateSubmitHint: string;
  /** Primary CTA while request is in flight */
  sending: string;
  calculating: string;
  successTitle: string;
  successSentToBusiness: string;
  /** Prefix in success state before the amount, e.g. "Your estimated price is" */
  estimatedPricePrefix: string;
  /** Short label before estimate value (fallback) */
  yourEstimateShort: string;
  fillRequiredFields: string;
  fieldRequired: string;
  selectService: string;
  projectDetails: string;
  invalidEmail: string;
  nameRequired: string;
  emailRequired: string;
  phoneRequired: string;
  genericError: string;
  currency: string;
  quoteFormIntro: string;
  quickQuoteButton: string;
  quickQuoteUserMessage: string;
  languageAria: string;
};

const EN: QuoteUiStrings = {
  quoteFormTitle: 'Get a quote',
  backToChat: 'Back to chat',
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  phoneOptionalFull: 'Phone (optional)',
  optionalInParens: 'optional',
  yes: 'Yes',
  no: 'No',
  calculateAndSubmit: 'Calculate and Submit',
  calculateSubmitHint:
    'Submitting calculates your estimate and sends the request to the business in one step.',
  sending: 'Sending…',
  calculating: 'Calculating…',
  successTitle: 'Your quote request was submitted.',
  successSentToBusiness:
    'Your estimate was calculated and the request was sent to the business for review.',
  estimatedPricePrefix: 'Your estimated price is',
  yourEstimateShort: 'Your estimate',
  fillRequiredFields: 'Please fill out the required fields.',
  fieldRequired: 'This field is required',
  selectService: 'Select a service',
  projectDetails: 'Project details',
  invalidEmail: 'Please enter a valid email address.',
  nameRequired: 'Name is required.',
  emailRequired: 'Email is required.',
  phoneRequired: 'Phone is required.',
  genericError: 'Sorry, something went wrong. Please try again.',
  currency: 'Currency',
  quoteFormIntro: 'Sure — please fill out the quote form below and submit to get your price.',
  quickQuoteButton: 'I want a quote',
  quickQuoteUserMessage: 'I want a quote',
  languageAria: 'Language',
};

const FR: QuoteUiStrings = {
  quoteFormTitle: 'Obtenir un devis',
  backToChat: 'Retour au chat',
  name: 'Nom',
  email: 'E-mail',
  phone: 'Téléphone',
  phoneOptionalFull: 'Téléphone (optionnel)',
  optionalInParens: 'optionnel',
  yes: 'Oui',
  no: 'Non',
  calculateAndSubmit: 'Calculer et envoyer',
  calculateSubmitHint:
    'En envoyant, vous calculez l’estimation et transmettez la demande à l’entreprise en une seule étape.',
  sending: 'Envoi en cours…',
  calculating: 'Calcul en cours…',
  successTitle: 'Votre demande de devis a été envoyée.',
  successSentToBusiness:
    'Votre estimation a été calculée et la demande a été transmise à l’entreprise pour examen.',
  estimatedPricePrefix: 'Votre prix estimé est',
  yourEstimateShort: 'Votre estimation',
  fillRequiredFields: 'Veuillez remplir les champs obligatoires.',
  fieldRequired: 'Ce champ est obligatoire',
  selectService: 'Sélectionnez un service',
  projectDetails: 'Détails du projet',
  invalidEmail: 'Veuillez entrer une adresse e-mail valide.',
  nameRequired: 'Le nom est requis.',
  emailRequired: 'L’e-mail est requis.',
  phoneRequired: 'Le téléphone est requis.',
  genericError: 'Désolé, une erreur s’est produite. Veuillez réessayer.',
  currency: 'Devise',
  quoteFormIntro:
    'Bien sûr — remplissez le formulaire ci-dessous puis envoyez-le pour obtenir votre prix.',
  quickQuoteButton: 'Je veux un devis',
  quickQuoteUserMessage: 'Je veux un devis',
  languageAria: 'Langue',
};

/** True when we should use the canonical FR pack (fr, fr-CA, fr-ca, …). */
export function isFrenchQuoteLocale(locale: string): boolean {
  return String(locale || '')
    .trim()
    .toLowerCase()
    .startsWith('fr');
}

/** Core strings from the widget translation table (non-en/fr locales). */
function widgetQuoteCore(t: (key: WidgetTranslationKey) => string): Omit<
  QuoteUiStrings,
  | 'phoneOptionalFull'
  | 'optionalInParens'
  | 'yes'
  | 'no'
  | 'fillRequiredFields'
  | 'fieldRequired'
  | 'selectService'
  | 'projectDetails'
  | 'estimatedPricePrefix'
  | 'currency'
  | 'languageAria'
> {
  return {
    quoteFormTitle: t('quoteFormTitle'),
    backToChat: t('quoteFormBackToChat'),
    name: t('leadFormName'),
    email: t('leadFormEmail'),
    phone: t('leadFormPhone'),
    calculateAndSubmit: t('quoteFormCalculate'),
    calculateSubmitHint: t('quoteFormCalculateSubmitHint'),
    sending: t('loading'),
    calculating: t('loading'),
    successTitle: t('quoteFormSuccess'),
    successSentToBusiness: t('quoteFormSuccessSentToBusiness'),
    estimatedPricePrefix: t('quoteFormYourEstimate'),
    yourEstimateShort: t('quoteFormYourEstimate'),
    invalidEmail: t('quoteFormInvalidEmail'),
    nameRequired: t('quoteFormNameRequired'),
    emailRequired: t('quoteFormEmailRequired'),
    phoneRequired: t('quoteFormPhoneRequired'),
    genericError: t('errorMessage'),
    quoteFormIntro: EN.quoteFormIntro,
    quickQuoteButton: t('suggestionQuote'),
    quickQuoteUserMessage: t('suggestionQuote'),
  };
}

function optionalWordForLocale(locale: string): string {
  const n = normalizeLocale(locale);
  if (n === 'fr') return FR.optionalInParens;
  if (n === 'es') return 'opcional';
  if (n === 'de') return 'optional';
  if (n === 'pt') return 'opcional';
  if (n === 'it') return 'opzionale';
  return EN.optionalInParens;
}

function fromWidgetTForLocaleFixed(locale: string, t: (key: WidgetTranslationKey) => string): QuoteUiStrings {
  const n = normalizeLocale(locale);
  const opt = optionalWordForLocale(locale);
  const core = widgetQuoteCore(t);
  return {
    ...core,
    phoneOptionalFull: `${t('leadFormPhone')} (${opt})`,
    optionalInParens: opt,
    yes:
      n === 'fr'
        ? FR.yes
        : n === 'es'
          ? 'Sí'
          : n === 'de'
            ? 'Ja'
            : n === 'pt'
              ? 'Sim'
              : n === 'it'
                ? 'Sì'
                : EN.yes,
    no:
      n === 'fr'
        ? FR.no
        : n === 'es'
          ? 'No'
          : n === 'de'
            ? 'Nein'
            : n === 'pt'
              ? 'Não'
              : n === 'it'
                ? 'No'
                : EN.no,
    fillRequiredFields:
      n === 'fr'
        ? FR.fillRequiredFields
        : n === 'es'
          ? 'Por favor, complete los campos obligatorios.'
          : n === 'de'
            ? 'Bitte füllen Sie die Pflichtfelder aus.'
            : n === 'pt'
              ? 'Preencha os campos obrigatórios.'
              : n === 'it'
                ? 'Compila i campi obbligatori.'
                : EN.fillRequiredFields,
    fieldRequired:
      n === 'fr'
        ? FR.fieldRequired
        : n === 'es'
          ? 'Este campo es obligatorio'
          : n === 'de'
            ? 'Dieses Feld ist erforderlich'
            : n === 'pt'
              ? 'Este campo é obrigatório'
              : n === 'it'
                ? 'Questo campo è obbligatorio'
                : EN.fieldRequired,
    selectService:
      n === 'fr'
        ? FR.selectService
        : n === 'es'
          ? 'Seleccione un servicio'
          : n === 'de'
            ? 'Wählen Sie eine Dienstleistung'
            : n === 'pt'
              ? 'Selecione um serviço'
              : n === 'it'
                ? 'Seleziona un servizio'
                : EN.selectService,
    projectDetails:
      n === 'fr'
        ? FR.projectDetails
        : n === 'es'
          ? 'Detalles del proyecto'
          : n === 'de'
            ? 'Projektdetails'
            : n === 'pt'
              ? 'Detalhes do projeto'
              : n === 'it'
                ? 'Dettagli del progetto'
                : EN.projectDetails,
    estimatedPricePrefix:
      n === 'fr'
        ? FR.estimatedPricePrefix
        : n === 'es'
          ? 'Su precio estimado es'
          : n === 'de'
            ? 'Ihr geschätzter Preis ist'
            : n === 'pt'
              ? 'O seu preço estimado é'
              : n === 'it'
                ? 'Il suo prezzo stimato è'
                : EN.estimatedPricePrefix,
    currency:
      n === 'fr'
        ? FR.currency
        : n === 'es'
          ? 'Moneda'
          : n === 'de'
            ? 'Währung'
            : n === 'pt'
              ? 'Moeda'
              : n === 'it'
                ? 'Valuta'
                : EN.currency,
    languageAria:
      n === 'fr'
        ? FR.languageAria
        : n === 'es'
          ? 'Idioma'
          : n === 'de'
            ? 'Sprache'
            : n === 'pt'
              ? 'Idioma'
              : n === 'it'
                ? 'Lingua'
                : EN.languageAria,
  };
}

function applyCustomOverrides(
  base: QuoteUiStrings,
  locale: string,
  custom: CustomTranslations | null | undefined
): QuoteUiStrings {
  const n = normalizeLocale(locale);
  const c = custom?.[n] ?? custom?.[locale];
  if (!c) return base;
  const next = { ...base };
  if (c.quoteFormCalculate) next.calculateAndSubmit = c.quoteFormCalculate;
  if (c.quoteFormTitle) next.quoteFormTitle = c.quoteFormTitle;
  if (c.quoteFormBackToChat) next.backToChat = c.quoteFormBackToChat;
  if (c.quoteFormCalculateSubmitHint) next.calculateSubmitHint = c.quoteFormCalculateSubmitHint;
  if (c.quoteFormSuccess) next.successTitle = c.quoteFormSuccess;
  if (c.quoteFormSuccessSentToBusiness) next.successSentToBusiness = c.quoteFormSuccessSentToBusiness;
  if (c.quoteFormYourEstimate) {
    next.yourEstimateShort = c.quoteFormYourEstimate;
    next.estimatedPricePrefix = c.quoteFormYourEstimate;
  }
  if (c.leadFormName) next.name = c.leadFormName;
  if (c.leadFormEmail) next.email = c.leadFormEmail;
  if (c.leadFormPhone) {
    next.phone = c.leadFormPhone;
    next.phoneOptionalFull = `${c.leadFormPhone} (${next.optionalInParens})`;
  }
  if (c.quoteFormInvalidEmail) next.invalidEmail = c.quoteFormInvalidEmail;
  if (c.quoteFormNameRequired) next.nameRequired = c.quoteFormNameRequired;
  if (c.quoteFormEmailRequired) next.emailRequired = c.quoteFormEmailRequired;
  if (c.quoteFormPhoneRequired) next.phoneRequired = c.quoteFormPhoneRequired;
  if (c.errorMessage) next.genericError = c.errorMessage;
  if (c.loading) {
    next.sending = c.loading;
    next.calculating = c.loading;
  }
  return next;
}

/**
 * Quote UI strings for a resolved UI locale.
 * - French (any fr*) uses the canonical FR pack (aligned with AI Page Assistant).
 * - English uses the canonical EN pack.
 * - Other supported widget languages use widget dictionary + small localizations for yes/no, etc.
 */
export function getQuoteUiStrings(
  resolvedLocale: string,
  options?: {
    widgetT?: (key: WidgetTranslationKey) => string;
    customTranslations?: CustomTranslations | null;
  }
): QuoteUiStrings {
  const custom = options?.customTranslations;
  const widgetT = options?.widgetT;

  let base: QuoteUiStrings;
  if (isFrenchQuoteLocale(resolvedLocale)) {
    base = { ...FR };
  } else if (normalizeLocale(resolvedLocale) === 'en') {
    base = { ...EN };
  } else if (widgetT) {
    base = fromWidgetTForLocaleFixed(resolvedLocale, widgetT);
  } else {
    base = { ...EN };
  }

  return applyCustomOverrides(base, resolvedLocale, custom);
}

/** fr-CA: use French pack but Courriel for email (matches Canadian convention). */
export function applyFrCaEmailLabel(qs: QuoteUiStrings, locale: string): QuoteUiStrings {
  if (String(locale).toLowerCase().startsWith('fr-ca')) {
    return { ...qs, email: 'Courriel' };
  }
  return qs;
}
