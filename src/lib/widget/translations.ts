/**
 * Widget UI translation dictionaries for multilingual support.
 * Keys: welcomeMessage, placeholder, send, typingIndicator, restartChat,
 * leadFormName, leadFormEmail, leadFormPhone, leadFormMessage, offlineMessage,
 * errorMessage, chatTab, close, poweredBy, loading.
 * Fallback: English when a key is missing.
 */

export type WidgetTranslationKey =
  | 'welcomeMessage'
  | 'placeholder'
  | 'send'
  | 'typingIndicator'
  | 'restartChat'
  | 'suggestionQuote'
  | 'suggestionServices'
  | 'suggestionHours'
  | 'leadFormName'
  | 'leadFormEmail'
  | 'leadFormPhone'
  | 'leadFormMessage'
  | 'offlineMessage'
  | 'errorMessage'
  | 'chatTab'
  | 'close'
  | 'poweredBy'
  | 'loading'
  | 'quoteFormTitle'
  | 'quoteFormCalculate'
  | 'quoteFormYourEstimate'
  | 'quoteFormSubmitRequest'
  | 'quoteFormBackToChat'
  | 'quoteFormMissing'
  | 'quoteFormTotal'
  | 'quoteFormSuccess'
  | 'quoteFormSuccessSentToBusiness'
  | 'quoteFormCalculateSubmitHint'
  | 'quoteFormInvalidEmail'
  | 'quoteFormNameRequired'
  | 'quoteFormEmailRequired'
  | 'quoteFormPhoneRequired';

export const DEFAULT_WELCOME = 'Hi! How can I help you today?';

const en: Record<WidgetTranslationKey, string> = {
  welcomeMessage: DEFAULT_WELCOME,
  placeholder: 'Type a message...',
  send: 'Send',
  typingIndicator: 'Typing...',
  restartChat: 'Restart chat',
  suggestionQuote: 'Get a quote',
  suggestionServices: 'What services do you offer?',
  suggestionHours: 'What are your hours?',
  leadFormName: 'Name',
  leadFormEmail: 'Email',
  leadFormPhone: 'Phone',
  leadFormMessage: 'Message',
  offlineMessage: 'We\'re offline. Leave a message and we\'ll get back to you.',
  errorMessage: 'Sorry, something went wrong. Please try again.',
  chatTab: 'Chat',
  close: 'Close',
  poweredBy: 'Powered by Spaxio Assistant',
  loading: 'Loading...',
  quoteFormTitle: 'Get a quote',
  quoteFormCalculate: 'Calculate and Submit',
  quoteFormYourEstimate: 'Your estimate',
  quoteFormSubmitRequest: 'Submit quote request',
  quoteFormBackToChat: 'Back to chat',
  quoteFormMissing: 'Missing',
  quoteFormTotal: 'Total',
  quoteFormSuccess: 'Your quote request was submitted.',
  quoteFormSuccessSentToBusiness: 'Your estimate was calculated and the request was sent to the business for review.',
  quoteFormCalculateSubmitHint:
    'Submitting calculates your estimate and sends the request to the business in one step.',
  quoteFormInvalidEmail: 'Please enter a valid email address.',
  quoteFormNameRequired: 'Name is required.',
  quoteFormEmailRequired: 'Email is required.',
  quoteFormPhoneRequired: 'Phone is required.',
};

const fr: Record<WidgetTranslationKey, string> = {
  welcomeMessage: 'Bonjour ! Comment puis-je vous aider ?',
  placeholder: 'Écrivez un message...',
  send: 'Envoyer',
  typingIndicator: 'Saisie en cours...',
  restartChat: 'Recommencer la conversation',
  suggestionQuote: 'Obtenir un devis',
  suggestionServices: 'Quels services proposez-vous ?',
  suggestionHours: 'Quels sont vos horaires ?',
  leadFormName: 'Nom',
  leadFormEmail: 'E-mail',
  leadFormPhone: 'Téléphone',
  leadFormMessage: 'Message',
  offlineMessage: 'Nous sommes hors ligne. Laissez un message et nous vous recontacterons.',
  errorMessage: 'Désolé, une erreur s\'est produite. Veuillez réessayer.',
  chatTab: 'Chat',
  close: 'Fermer',
  poweredBy: 'Propulsé par Spaxio Assistant',
  loading: 'Chargement...',
  quoteFormTitle: 'Obtenir un devis',
  quoteFormCalculate: 'Calculer et envoyer',
  quoteFormYourEstimate: 'Votre estimation',
  quoteFormSubmitRequest: 'Envoyer la demande',
  quoteFormBackToChat: 'Retour au chat',
  quoteFormMissing: 'Manquant',
  quoteFormTotal: 'Total',
  quoteFormSuccess: 'Votre demande de devis a été envoyée.',
  quoteFormSuccessSentToBusiness:
    'Votre estimation a été calculée et la demande a été transmise à l’entreprise pour examen.',
  quoteFormCalculateSubmitHint:
    'En envoyant, vous calculez l’estimation et transmettez la demande à l’entreprise en une seule étape.',
  quoteFormInvalidEmail: 'Veuillez entrer une adresse e-mail valide.',
  quoteFormNameRequired: 'Le nom est requis.',
  quoteFormEmailRequired: 'L\'e-mail est requis.',
  quoteFormPhoneRequired: 'Le téléphone est requis.',
};

const es: Record<WidgetTranslationKey, string> = {
  welcomeMessage: '¡Hola! ¿Cómo puedo ayudarte hoy?',
  placeholder: 'Escribe un mensaje...',
  send: 'Enviar',
  typingIndicator: 'Escribiendo...',
  restartChat: 'Reiniciar chat',
  suggestionQuote: 'Quiero un presupuesto',
  suggestionServices: '¿Qué servicios ofrecen?',
  suggestionHours: '¿Cuáles son sus horarios?',
  leadFormName: 'Nombre',
  leadFormEmail: 'Correo electrónico',
  leadFormPhone: 'Teléfono',
  leadFormMessage: 'Mensaje',
  offlineMessage: 'Estamos desconectados. Deja un mensaje y te responderemos.',
  errorMessage: 'Lo sentimos, algo salió mal. Por favor, inténtalo de nuevo.',
  chatTab: 'Chat',
  close: 'Cerrar',
  poweredBy: 'Desarrollado por Spaxio Assistant',
  loading: 'Cargando...',
  quoteFormTitle: 'Obtener un presupuesto',
  quoteFormCalculate: 'Calcular y enviar',
  quoteFormYourEstimate: 'Su estimación',
  quoteFormSubmitRequest: 'Enviar solicitud',
  quoteFormBackToChat: 'Volver al chat',
  quoteFormMissing: 'Faltan',
  quoteFormTotal: 'Total',
  quoteFormSuccess: 'Tu solicitud de presupuesto fue enviada.',
  quoteFormSuccessSentToBusiness:
    'Se calculó tu estimación y la solicitud se envió al negocio para su revisión.',
  quoteFormCalculateSubmitHint:
    'Al enviar, se calcula tu estimación y se envía la solicitud al negocio en un solo paso.',
  quoteFormInvalidEmail: 'Por favor, introduce una dirección de correo válida.',
  quoteFormNameRequired: 'El nombre es obligatorio.',
  quoteFormEmailRequired: 'El correo es obligatorio.',
  quoteFormPhoneRequired: 'El teléfono es obligatorio.',
};

const de: Record<WidgetTranslationKey, string> = {
  welcomeMessage: 'Hallo! Wie kann ich Ihnen heute helfen?',
  placeholder: 'Nachricht eingeben...',
  send: 'Senden',
  typingIndicator: 'Tippen...',
  restartChat: 'Chat neu starten',
  suggestionQuote: 'Angebot anfordern',
  suggestionServices: 'Welche Leistungen bieten Sie an?',
  suggestionHours: 'Welche Öffnungszeiten haben Sie?',
  leadFormName: 'Name',
  leadFormEmail: 'E-Mail',
  leadFormPhone: 'Telefon',
  leadFormMessage: 'Nachricht',
  offlineMessage: 'Wir sind offline. Hinterlassen Sie eine Nachricht, wir melden uns.',
  errorMessage: 'Entschuldigung, etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
  chatTab: 'Chat',
  close: 'Schließen',
  poweredBy: 'Unterstützt von Spaxio Assistant',
  loading: 'Laden...',
  quoteFormTitle: 'Angebot anfordern',
  quoteFormCalculate: 'Berechnen und senden',
  quoteFormYourEstimate: 'Ihre Schätzung',
  quoteFormSubmitRequest: 'Anfrage senden',
  quoteFormBackToChat: 'Zurück zum Chat',
  quoteFormMissing: 'Fehlend',
  quoteFormTotal: 'Gesamt',
  quoteFormSuccess: 'Ihre Angebotsanfrage wurde gesendet.',
  quoteFormSuccessSentToBusiness:
    'Ihre Schätzung wurde berechnet und die Anfrage zur Prüfung an das Unternehmen gesendet.',
  quoteFormCalculateSubmitHint:
    'Mit dem Senden wird Ihre Schätzung berechnet und die Anfrage in einem Schritt übermittelt.',
  quoteFormInvalidEmail: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
  quoteFormNameRequired: 'Name ist erforderlich.',
  quoteFormEmailRequired: 'E-Mail ist erforderlich.',
  quoteFormPhoneRequired: 'Telefon ist erforderlich.',
};

const pt: Record<WidgetTranslationKey, string> = {
  welcomeMessage: 'Olá! Como posso ajudar você hoje?',
  placeholder: 'Digite uma mensagem...',
  send: 'Enviar',
  typingIndicator: 'Digitando...',
  restartChat: 'Reiniciar conversa',
  suggestionQuote: 'Solicitar orçamento',
  suggestionServices: 'Quais serviços vocês oferecem?',
  suggestionHours: 'Quais são os seus horários?',
  leadFormName: 'Nome',
  leadFormEmail: 'E-mail',
  leadFormPhone: 'Telefone',
  leadFormMessage: 'Mensagem',
  offlineMessage: 'Estamos offline. Deixe uma mensagem e entraremos em contato.',
  errorMessage: 'Desculpe, algo deu errado. Por favor, tente novamente.',
  chatTab: 'Chat',
  close: 'Fechar',
  poweredBy: 'Desenvolvido por Spaxio Assistant',
  loading: 'Carregando...',
  quoteFormTitle: 'Solicitar orçamento',
  quoteFormCalculate: 'Calcular e enviar',
  quoteFormYourEstimate: 'Sua estimativa',
  quoteFormSubmitRequest: 'Enviar pedido',
  quoteFormBackToChat: 'Voltar ao chat',
  quoteFormMissing: 'Em falta',
  quoteFormTotal: 'Total',
  quoteFormSuccess: 'O seu pedido de orçamento foi enviado.',
  quoteFormSuccessSentToBusiness:
    'A sua estimativa foi calculada e o pedido foi enviado ao negócio para revisão.',
  quoteFormCalculateSubmitHint:
    'Ao enviar, a sua estimativa é calculada e o pedido é enviado ao negócio num único passo.',
  quoteFormInvalidEmail: 'Por favor, introduza um endereço de e-mail válido.',
  quoteFormNameRequired: 'O nome é obrigatório.',
  quoteFormEmailRequired: 'O e-mail é obrigatório.',
  quoteFormPhoneRequired: 'O telefone é obrigatório.',
};

const it: Record<WidgetTranslationKey, string> = {
  welcomeMessage: 'Ciao! Come posso aiutarti oggi?',
  placeholder: 'Scrivi un messaggio...',
  send: 'Invia',
  typingIndicator: 'Sta scrivendo...',
  restartChat: 'Ricomincia chat',
  suggestionQuote: 'Richiedi preventivo',
  suggestionServices: 'Che servizi offrite?',
  suggestionHours: 'Quali sono i vostri orari?',
  leadFormName: 'Nome',
  leadFormEmail: 'Email',
  leadFormPhone: 'Telefono',
  leadFormMessage: 'Messaggio',
  offlineMessage: 'Siamo offline. Lascia un messaggio e ti risponderemo.',
  errorMessage: 'Scusa, qualcosa è andato storto. Riprova.',
  chatTab: 'Chat',
  close: 'Chiudi',
  poweredBy: 'Powered by Spaxio Assistant',
  loading: 'Caricamento...',
  quoteFormTitle: 'Richiedi preventivo',
  quoteFormCalculate: 'Calcola e invia',
  quoteFormYourEstimate: 'La tua stima',
  quoteFormSubmitRequest: 'Invia richiesta',
  quoteFormBackToChat: 'Torna alla chat',
  quoteFormMissing: 'Mancante',
  quoteFormTotal: 'Totale',
  quoteFormSuccess: 'La tua richiesta di preventivo è stata inviata.',
  quoteFormSuccessSentToBusiness:
    'La tua stima è stata calcolata e la richiesta è stata inviata all’attività per la revisione.',
  quoteFormCalculateSubmitHint:
    'Inviando, calcoli il preventivo e invii la richiesta all’attività in un solo passaggio.',
  quoteFormInvalidEmail: 'Inserisci un indirizzo email valido.',
  quoteFormNameRequired: 'Il nome è obbligatorio.',
  quoteFormEmailRequired: 'L\'email è obbligatoria.',
  quoteFormPhoneRequired: 'Il telefono è obbligatorio.',
};

export const WIDGET_TRANSLATIONS: Record<string, Record<WidgetTranslationKey, string>> = {
  en,
  fr,
  es,
  de,
  pt,
  it,
};

export type CustomTranslations = Partial<Record<string, Partial<Record<WidgetTranslationKey, string>>>>;

/**
 * Get translated string for a key. Uses custom overrides from dashboard if provided,
 * then built-in dictionary, then English fallback.
 */
export function getWidgetTranslation(
  lang: string,
  key: WidgetTranslationKey,
  customTranslations?: CustomTranslations | null
): string {
  const normalized = normalizeLocale(lang);
  const custom = customTranslations?.[normalized]?.[key] ?? customTranslations?.[lang]?.[key];
  if (custom) return custom;
  const dict = WIDGET_TRANSLATIONS[normalized] ?? WIDGET_TRANSLATIONS[lang];
  if (dict && key in dict) return (dict as Record<WidgetTranslationKey, string>)[key];
  return (WIDGET_TRANSLATIONS.en as Record<WidgetTranslationKey, string>)[key];
}

/**
 * Normalize locale to 2-letter code (e.g. en-US -> en, fr-CA -> fr).
 */
export function normalizeLocale(locale: string): string {
  const v = String(locale).trim().toLowerCase();
  if (!v) return 'en';
  if (v.length >= 2 && v.charAt(2) === '-') return v.slice(0, 2);
  return v.slice(0, 2);
}
