/** Stored on quote_requests.submission_source — keep in sync with dashboard labels. */
export const QUOTE_SUBMISSION_SOURCE = {
  AI_WIDGET: 'ai_widget',
  AI_PAGE_ASSISTANT: 'ai_page_assistant',
  EMBEDDED_FORM: 'embedded_form',
} as const;

export type QuoteSubmissionSource =
  (typeof QUOTE_SUBMISSION_SOURCE)[keyof typeof QUOTE_SUBMISSION_SOURCE];
