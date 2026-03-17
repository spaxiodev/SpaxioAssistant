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
  | 'quoteFormTotal';

export const DEFAULT_WELCOME = 'Hi! How can I help you today?';

const en: Record<WidgetTranslationKey, string> = {
  welcomeMessage: DEFAULT_WELCOME,
  placeholder: 'Type a message...',
  send: 'Send',
  typingIndicator: 'Typing...',
  restartChat: 'Restart chat',
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
  quoteFormCalculate: 'Calculate',
  quoteFormYourEstimate: 'Your estimate',
  quoteFormSubmitRequest: 'Submit quote request',
  quoteFormBackToChat: 'Back to chat',
  quoteFormMissing: 'Missing',
  quoteFormTotal: 'Total',
};

const fr: Record<WidgetTranslationKey, string> = {
  welcomeMessage: 'Bonjour ! Comment puis-je vous aider ?',
  placeholder: 'Écrivez un message...',
  send: 'Envoyer',
  typingIndicator: 'Saisie en cours...',
  restartChat: 'Recommencer la conversation',
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
  quoteFormCalculate: 'Calculer',
  quoteFormYourEstimate: 'Votre estimation',
  quoteFormSubmitRequest: 'Envoyer la demande',
  quoteFormBackToChat: 'Retour au chat',
  quoteFormMissing: 'Manquant',
  quoteFormTotal: 'Total',
};

const es: Record<WidgetTranslationKey, string> = {
  welcomeMessage: '¡Hola! ¿Cómo puedo ayudarte hoy?',
  placeholder: 'Escribe un mensaje...',
  send: 'Enviar',
  typingIndicator: 'Escribiendo...',
  restartChat: 'Reiniciar chat',
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
  quoteFormCalculate: 'Calcular',
  quoteFormYourEstimate: 'Su estimación',
  quoteFormSubmitRequest: 'Enviar solicitud',
  quoteFormBackToChat: 'Volver al chat',
  quoteFormMissing: 'Faltan',
  quoteFormTotal: 'Total',
};

const de: Record<WidgetTranslationKey, string> = {
  welcomeMessage: 'Hallo! Wie kann ich Ihnen heute helfen?',
  placeholder: 'Nachricht eingeben...',
  send: 'Senden',
  typingIndicator: 'Tippen...',
  restartChat: 'Chat neu starten',
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
  quoteFormCalculate: 'Berechnen',
  quoteFormYourEstimate: 'Ihre Schätzung',
  quoteFormSubmitRequest: 'Anfrage senden',
  quoteFormBackToChat: 'Zurück zum Chat',
  quoteFormMissing: 'Fehlend',
  quoteFormTotal: 'Gesamt',
};

const pt: Record<WidgetTranslationKey, string> = {
  welcomeMessage: 'Olá! Como posso ajudar você hoje?',
  placeholder: 'Digite uma mensagem...',
  send: 'Enviar',
  typingIndicator: 'Digitando...',
  restartChat: 'Reiniciar conversa',
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
  quoteFormCalculate: 'Calcular',
  quoteFormYourEstimate: 'Sua estimativa',
  quoteFormSubmitRequest: 'Enviar pedido',
  quoteFormBackToChat: 'Voltar ao chat',
  quoteFormMissing: 'Em falta',
  quoteFormTotal: 'Total',
};

const it: Record<WidgetTranslationKey, string> = {
  welcomeMessage: 'Ciao! Come posso aiutarti oggi?',
  placeholder: 'Scrivi un messaggio...',
  send: 'Invia',
  typingIndicator: 'Sta scrivendo...',
  restartChat: 'Ricomincia chat',
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
  quoteFormCalculate: 'Calcola',
  quoteFormYourEstimate: 'La tua stima',
  quoteFormSubmitRequest: 'Invia richiesta',
  quoteFormBackToChat: 'Torna alla chat',
  quoteFormMissing: 'Mancante',
  quoteFormTotal: 'Totale',
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
