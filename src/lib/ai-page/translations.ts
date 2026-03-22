/**
 * AI page translation dictionaries for quote form and chat UI.
 * Used when the page is embedded and needs to match the client's website language.
 */

export type AiPageTranslationKey =
  | 'placeholder'
  | 'send'
  | 'thinking'
  | 'quickQuoteButton'
  | 'quickQuoteUserMessage'
  | 'quoteFormIntro'
  | 'quoteFormTitle'
  | 'backToChat'
  | 'name'
  | 'email'
  | 'phoneOptional'
  | 'submitAndGetPrice'
  | 'quoteFormCalculateSubmitHint'
  | 'currency'
  | 'quoteFormSuccess'
  | 'quoteFormSuccessSentToBusiness';

function normalizeLocale(locale: string): string {
  const v = String(locale || '').trim().toLowerCase();
  if (!v) return 'en';
  if (v.startsWith('fr-ca')) return 'fr-CA';
  if (v.startsWith('fr')) return 'fr';
  if (v.startsWith('es')) return 'es';
  if (v.startsWith('de')) return 'de';
  if (v.startsWith('pt')) return 'pt';
  if (v.startsWith('it')) return 'it';
  return v.slice(0, 2) || 'en';
}

const en: Record<AiPageTranslationKey, string> = {
  placeholder: 'Type your message…',
  send: 'Send',
  thinking: 'Thinking…',
  quickQuoteButton: 'I want a quote',
  quickQuoteUserMessage: 'I want a quote',
  quoteFormIntro: 'Sure — please fill out the quote form below and submit to get your price.',
  quoteFormTitle: 'Quote form',
  backToChat: 'Back to chat',
  name: 'Name',
  email: 'Email',
  phoneOptional: 'Phone (optional)',
  submitAndGetPrice: 'Calculate and Submit',
  quoteFormCalculateSubmitHint:
    'Submitting calculates your estimate and sends the request to the business in one step.',
  currency: 'Currency',
  quoteFormSuccess: 'Your quote request was submitted.',
  quoteFormSuccessSentToBusiness: 'Your estimate was calculated and the request was sent to the business for review.',
};

const fr: Record<AiPageTranslationKey, string> = {
  placeholder: 'Écrivez votre message…',
  send: 'Envoyer',
  thinking: 'Réflexion…',
  quickQuoteButton: 'Je veux un devis',
  quickQuoteUserMessage: 'Je veux un devis',
  quoteFormIntro: 'Bien sûr — remplissez le formulaire ci-dessous puis envoyez-le pour obtenir votre prix.',
  quoteFormTitle: 'Formulaire de devis',
  backToChat: 'Retour au chat',
  name: 'Nom',
  email: 'E-mail',
  phoneOptional: 'Téléphone (optionnel)',
  submitAndGetPrice: 'Calculer et envoyer',
  quoteFormCalculateSubmitHint:
    'En envoyant, vous calculez l’estimation et transmettez la demande à l’entreprise en une seule étape.',
  currency: 'Devise',
  quoteFormSuccess: 'Votre demande de devis a été envoyée.',
  quoteFormSuccessSentToBusiness:
    'Votre estimation a été calculée et la demande a été transmise à l’entreprise pour examen.',
};

const frCA: Record<AiPageTranslationKey, string> = {
  ...fr,
  email: 'Courriel',
};

const es: Record<AiPageTranslationKey, string> = {
  placeholder: 'Escriba su mensaje…',
  send: 'Enviar',
  thinking: 'Pensando…',
  quickQuoteButton: 'Quiero un presupuesto',
  quickQuoteUserMessage: 'Quiero un presupuesto',
  quoteFormIntro: 'Claro — complete el formulario a continuación y envíelo para obtener su precio.',
  quoteFormTitle: 'Formulario de presupuesto',
  backToChat: 'Volver al chat',
  name: 'Nombre',
  email: 'Correo electrónico',
  phoneOptional: 'Teléfono (opcional)',
  submitAndGetPrice: 'Calcular y enviar',
  quoteFormCalculateSubmitHint:
    'Al enviar, se calcula tu estimación y se envía la solicitud al negocio en un solo paso.',
  currency: 'Moneda',
  quoteFormSuccess: 'Tu solicitud de presupuesto fue enviada.',
  quoteFormSuccessSentToBusiness:
    'Se calculó tu estimación y la solicitud se envió al negocio para su revisión.',
};

const de: Record<AiPageTranslationKey, string> = {
  placeholder: 'Nachricht eingeben…',
  send: 'Senden',
  thinking: 'Denke…',
  quickQuoteButton: 'Angebot anfordern',
  quickQuoteUserMessage: 'Ich möchte ein Angebot',
  quoteFormIntro: 'Gern — füllen Sie das Formular aus und senden Sie es, um Ihr Angebot zu erhalten.',
  quoteFormTitle: 'Anfrageformular',
  backToChat: 'Zurück zum Chat',
  name: 'Name',
  email: 'E-Mail',
  phoneOptional: 'Telefon (optional)',
  submitAndGetPrice: 'Berechnen und senden',
  quoteFormCalculateSubmitHint:
    'Mit dem Senden wird Ihre Schätzung berechnet und die Anfrage in einem Schritt übermittelt.',
  currency: 'Währung',
  quoteFormSuccess: 'Ihre Angebotsanfrage wurde gesendet.',
  quoteFormSuccessSentToBusiness:
    'Ihre Schätzung wurde berechnet und die Anfrage zur Prüfung an das Unternehmen gesendet.',
};

const pt: Record<AiPageTranslationKey, string> = {
  placeholder: 'Digite sua mensagem…',
  send: 'Enviar',
  thinking: 'Pensando…',
  quickQuoteButton: 'Quero um orçamento',
  quickQuoteUserMessage: 'Quero um orçamento',
  quoteFormIntro: 'Claro — preencha o formulário abaixo e envie para obter seu preço.',
  quoteFormTitle: 'Formulário de orçamento',
  backToChat: 'Voltar ao chat',
  name: 'Nome',
  email: 'E-mail',
  phoneOptional: 'Telefone (opcional)',
  submitAndGetPrice: 'Calcular e enviar',
  quoteFormCalculateSubmitHint:
    'Ao enviar, a sua estimativa é calculada e o pedido é enviado ao negócio num único passo.',
  currency: 'Moeda',
  quoteFormSuccess: 'O seu pedido de orçamento foi enviado.',
  quoteFormSuccessSentToBusiness:
    'A sua estimativa foi calculada e o pedido foi enviado ao negócio para revisão.',
};

const it: Record<AiPageTranslationKey, string> = {
  placeholder: 'Scrivi il tuo messaggio…',
  send: 'Invia',
  thinking: 'Sto pensando…',
  quickQuoteButton: 'Voglio un preventivo',
  quickQuoteUserMessage: 'Voglio un preventivo',
  quoteFormIntro: 'Certamente — compila il modulo qui sotto e invialo per ottenere il tuo prezzo.',
  quoteFormTitle: 'Modulo di preventivo',
  backToChat: 'Torna alla chat',
  name: 'Nome',
  email: 'Email',
  phoneOptional: 'Telefono (opzionale)',
  submitAndGetPrice: 'Calcola e invia',
  quoteFormCalculateSubmitHint:
    'Inviando, calcoli il preventivo e invii la richiesta all’attività in un solo passaggio.',
  currency: 'Valuta',
  quoteFormSuccess: 'La tua richiesta di preventivo è stata inviata.',
  quoteFormSuccessSentToBusiness:
    'La tua stima è stata calcolata e la richiesta è stata inviata all’attività per la revisione.',
};

const DICT: Record<string, Record<AiPageTranslationKey, string>> = {
  en,
  fr,
  'fr-CA': frCA,
  es,
  de,
  pt,
  it,
};

export function getAiPageTranslation(locale: string, key: AiPageTranslationKey): string {
  const norm = normalizeLocale(locale);
  const dict = DICT[norm] ?? DICT[norm.slice(0, 2)] ?? DICT.en;
  return dict[key] ?? en[key];
}
