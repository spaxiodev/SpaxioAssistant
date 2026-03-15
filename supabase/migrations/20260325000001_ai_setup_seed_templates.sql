-- Seed automation_templates for AI Setup Assistant (optional reference; app uses code-based templates)
INSERT INTO public.automation_templates (key, name, description, default_config)
VALUES
  ('lead_capture', 'Lead capture', 'Capture leads with name, email, phone, and message.', '{}'),
  ('quote_request_capture', 'Quote request capture', 'Collect quote requests with service and project details.', '{}'),
  ('appointment_request_capture', 'Appointment request capture', 'Capture appointment or callback requests.', '{}'),
  ('faq_chatbot', 'FAQ chatbot', 'Answer FAQs and escalate when needed.', '{}'),
  ('support_intake', 'Support intake', 'Collect support tickets with subject and description.', '{}'),
  ('email_notification', 'Email notification', 'Send email when a lead is captured.', '{}'),
  ('webhook_workflow', 'Webhook workflow', 'Forward lead/event data to an external URL.', '{}'),
  ('google_sheets_logging', 'Google Sheets logging', 'Log leads to a spreadsheet.', '{}'),
  ('crm_push', 'CRM push', 'Push leads to your CRM.', '{}'),
  ('slack_notification', 'Slack notification', 'Post new leads to Slack.', '{}')
ON CONFLICT (key) DO NOTHING;
