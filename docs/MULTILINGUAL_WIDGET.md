# Multilingual Widget System

The Spaxio Assistant widget and backend support dynamic multilingual behavior so the chatbot matches the host website language.

## Overview

- **Widget UI** (welcome message, placeholder, buttons, errors, etc.) is translated via dictionaries (en, fr, es, de, pt, it) with optional dashboard overrides.
- **AI replies** follow the active widget/site language; the system prompt enforces responding in that language and within supported languages.
- **Language detection** runs on the host page (embed script) and can react to live changes (e.g. `<html lang="">` or `window.SpaxioAssistant.setLanguage()`).

## 1. Language detection (embed script)

Order of precedence:

1. `document.documentElement.lang` (or `document.documentElement.getAttribute('lang')`)
2. `window.__SPAXIO_LANG__` (configurable global)
3. URL path segments: `/en/`, `/fr/`, `/es/`, etc.
4. `navigator.language`

Locale is normalized to a 2-letter code (e.g. `en-US` → `en`, `fr-CA` → `fr`). If nothing is detected, the chatbot **default language** from dashboard settings is used (or `en`).

## 2. Live language switching

- The embed script observes `<html>` for `lang` attribute changes via `MutationObserver`. When it changes, the widget iframe receives a `spaxio-lang-change` postMessage and the UI re-renders in the new language.
- **Conversation state is preserved**; only labels and language context for new messages change.
- Manual override: if the user selects a language from the in-widget language switcher (when enabled), that overrides auto-detection for the session.

## 3. Widget UI translations

- Keys: `welcomeMessage`, `placeholder`, `send`, `typingIndicator`, `restartChat`, `leadForm*`, `offlineMessage`, `errorMessage`, `chatTab`, `voiceTab`, `close`, `poweredBy`, `loading`.
- Default dictionaries live in `src/lib/widget/translations.ts` (en, fr, es, de, pt, it).
- Missing keys fall back to English.
- Dashboard can provide **custom translations** per language (stored in `business_settings.custom_translations`), which override the built-in strings.

## 4. Dashboard settings (chatbot-level)

Stored in `business_settings`:

| Setting | Description |
|--------|-------------|
| `default_language` | Language when detection is off or fails (e.g. `en`) |
| `supported_languages` | List of codes the widget and AI may use (e.g. `['en','fr','es']`) |
| `auto_detect_website_language` | Whether to detect from page/URL/navigator |
| `fallback_language` | Used when detection fails and no default |
| `match_ai_response_to_website_language` | Whether the AI must respond in the active language |
| `show_language_switcher` | Show language selector in widget header |
| `custom_translations` | Per-language overrides: `{ "en": { "welcomeMessage": "..." }, "fr": { ... } }` |

These are returned by `GET /api/widget/config` for the widget and can be updated via `PUT /api/settings` (dashboard).

## 5. Chat API and AI language control

Each chat request may send:

- `language` / `activeLocale` – current widget language used for UI and AI
- `detectedLocale` – what was detected from the page (before manual override)
- `supportedLanguages` – from config
- `pageUrl`, `browserLocale`, `manualLanguageOverride` – for context

The backend builds a **language instruction** block for the system prompt that:

- Tells the model to respond in the **active** language.
- Allows switching if the user clearly writes in another language mid-conversation.
- Restricts replies to **supported** languages unless the user explicitly asks otherwise.

## 6. RAG / knowledge base

When knowledge search is used (e.g. tools or future chat RAG), callers can pass `preferredLanguage`. The `match_knowledge_chunks` RPC orders results so chunks (or documents) with `metadata->>'lang'` matching that language appear first, then by similarity. If no language metadata is set, behavior is unchanged.

## 7. Embed script config

Host page can set, before the script runs:

```js
window.SpaxioAssistantConfig = {
  chatbotId: "<widget-id>",
  locale: "fr",
  supportedLanguages: ["en", "fr"],
  autoDetectWebsiteLanguage: true
};
```

- `locale`: overrides initial detection.
- `chatbotId`: overrides `data-widget-id` if present.
- If `locale` is not set, language is auto-detected.

## 8. Developer API (host page)

After the widget is mounted, the embed script exposes:

- `window.SpaxioAssistant.setLanguage(lang)` – set widget language and notify iframe.
- `window.SpaxioAssistant.getLanguage()` – current language code.
- `window.SpaxioAssistant.onLanguageChange(callback)` – called whenever the language changes (observer or `setLanguage`).

Legacy: `window.spaxioSetLanguage(lang)` still works.

## 9. Example embed code

```html
<script>
  window.SpaxioAssistantConfig = {
    chatbotId: "your-widget-uuid",
    locale: "fr",
    supportedLanguages: ["en", "fr"],
    autoDetectWebsiteLanguage: true
  };
</script>
<script src="https://your-app.com/widget.js" data-widget-id="your-widget-uuid"></script>
```

If `locale` is omitted, the script auto-detects from the page.

## 10. Backward compatibility

- Existing single-language installs keep working: default language remains `en`, detection and new fields are optional.
- Chat still accepts only `widgetId`, `message`, and `language`; extra locale fields are optional.
- Widget config API returns the new language fields with safe defaults when columns are missing (e.g. before migration).
