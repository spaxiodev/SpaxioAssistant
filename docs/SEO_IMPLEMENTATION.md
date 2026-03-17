# Spaxio Assistant — SEO Implementation

This document describes the production-grade SEO system added for Spaxio Assistant. **Dashboard, auth, and API routes are unchanged and not indexed.**

---

## 1. Files created or updated

### Created
- **`src/lib/seo/use-cases.ts`** — Data and slugs for programmatic SEO pages (`/ai/[use-case]`). Add new use cases here.
- **`src/app/[locale]/demo/ai-chat/layout.tsx`** — Metadata for the AI chatbot demo page.
- **`src/app/[locale]/widget-preview/layout.tsx`** — Metadata for the widget preview page.
- **`src/app/[locale]/ai/[useCase]/page.tsx`** — Dynamic SEO page component; statically generated for each use case and locale.
- **`docs/SEO_IMPLEMENTATION.md`** — This file.

### Updated
- **`src/app/seo.ts`** — `getSiteUrl()` using `NEXT_PUBLIC_APP_URL`; expanded keywords; added `widget-preview` to public paths; no hardcoded production URL for metadata/sitemap.
- **`src/app/layout.tsx`** — `metadataBase` and OpenGraph use `getSiteUrl()`; default title/description/keywords; Product schema in JSON-LD; Google + Bing verification via env.
- **`src/app/sitemap.ts`** — Uses `getSiteUrl()`; includes all public paths plus dynamic `/ai/[use-case]` for all locales.
- **`src/app/robots.ts`** — Uses `getSiteUrl()`; allows public pages; disallows `/dashboard`, `/api`, `/login`, `/signup`, `/invite`; **widget-preview allowed** for indexing.
- **`next.config.js`** — Rewrites: `/ai` and `/ai/:path*` → `/en/ai/:path*` so `/ai/ai-chatbot-for-electricians` works without locale.
- **`messages/en.json`**, **`messages/fr.json`**, **`messages/fr-CA.json`** — Stronger, keyword-rich metadata (home, pricing, contact, demo, widget preview).
- **`src/app/[locale]/page.tsx`** — Internal links: AI chatbot demo, Widget preview, Use cases (`/ai/ai-chatbot-for-website`).
- **`src/components/footer.tsx`** — Added “Demo” link for internal linking.

---

## 2. How the sitemap is generated

- **File:** `src/app/sitemap.ts` (Next.js convention; served at `/sitemap.xml`).
- **Base URL:** From `getSiteUrl()` (i.e. `NEXT_PUBLIC_APP_URL` in production).
- **Entries:**
  1. For each locale (`en`, `fr-CA`) and each path in `PUBLIC_PATHS`:  
     `/{locale}` or `/{locale}{path}` (e.g. `/en/pricing`, `/en/demo/ai-chat`, `/en/widget-preview`).
  2. For each locale and each use-case slug from `getAllUseCaseSlugs()`:  
     `/{locale}/ai/{slug}` (e.g. `/en/ai/ai-chatbot-for-electricians`).
- **Priorities / change frequency:** Homepage highest; pricing and AI pages monthly; rest yearly.

---

## 3. How to add more SEO pages (programmatic)

1. **Edit `src/lib/seo/use-cases.ts`.**
2. Add a new object to the `AI_USE_CASES` array with:
   - **`slug`** — URL segment (e.g. `ai-chatbot-for-plumbers`). Use lowercase, hyphens.
   - **`title`** — Meta title and visible context.
   - **`description`** — Meta description.
   - **`headline`** — H1 on the page.
   - **`body`** — Main paragraph.
   - **`benefits`** — Array of `{ title, body }` for the “Why use Spaxio Assistant” section.
   - **`keywords`** — Array of target keywords for the page.
3. Save. The page is available at:
   - `/[locale]/ai/[slug]` (e.g. `/en/ai/ai-chatbot-for-plumbers`).
   - `/ai/[slug]` (rewrite to `/en/ai/[slug]`).
4. **Sitemap:** New slugs are picked up automatically via `getAllUseCaseSlugs()` in `sitemap.ts`. No other change needed.

---

## 4. Google Search Console verification

1. In [Google Search Console](https://search.google.com/search-console), add your property (e.g. `https://www.spaxioassistant.com`).
2. Choose **“HTML tag”** verification.
3. Copy the `content` value from the meta tag (e.g. `content="abc123..."`).
4. Set the env variable (e.g. in Vercel or `.env.production`):
   ```bash
   NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=abc123...
   ```
5. Redeploy. The root layout injects `<meta name="google-site-verification" content="...">` when this variable is set.
6. In Search Console, click **Verify**.

---

## 5. Bing Webmaster Tools verification

1. In [Bing Webmaster Tools](https://www.bing.com/webmasters), add your site.
2. Choose **“Meta tag”** verification.
3. Copy the value of the `content` attribute (e.g. `content="DEF456..."`).
4. Set the env variable:
   ```bash
   NEXT_PUBLIC_BING_SITE_VERIFICATION=DEF456...
   ```
5. Redeploy. The root layout adds the meta tag via metadata `other: { 'msvalidate.01': '...' }` when this variable is set.
6. In Bing, click **Verify**.

**Do not hardcode** verification codes; use env vars only.

---

## 6. Keywords targeted

- **Global / homepage:** AI chatbot for website, AI chatbot widget, AI automation platform, AI CRM for small business, AI lead capture tool, AI quote generator, AI website assistant, AI assistant platform, AI for business.
- **Pricing:** AI chatbot pricing, AI automation pricing, transparent plans.
- **Contact:** Support, sales, implementation help.
- **Demo:** AI chatbot demo, AI chat demo, chatbot demo.
- **Widget preview:** AI chatbot widget preview, embed chatbot.
- **Programmatic pages:** Per use case in `src/lib/seo/use-cases.ts` (e.g. “AI chatbot for electricians”, “AI lead generation for small business”, “AI quote generator for contractors”).

---

## 7. Safety (unchanged)

- **Dashboard:** Not modified; still noindex via `src/app/[locale]/dashboard/layout.tsx`.
- **Auth:** No changes to login/signup or auth logic.
- **API:** No changes to API routes.
- **Supabase:** No changes to Supabase usage.
- **i18n:** `[locale]` and next-intl kept; all public SEO pages are locale-aware.
- **Routing:** No 404s introduced; rewrites for `/ai` and `/ai/:path*` point to `/en/ai/:path*`.

---

## 8. Performance and technical SEO

- Metadata and JSON-LD are server-rendered (no client-only SEO).
- Images: continue using `next/image` where applicable.
- No blocking scripts added; existing analytics/theme logic unchanged.
- Programmatic SEO pages use `generateStaticParams` for static generation where possible.
