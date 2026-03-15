import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'fr-CA'],
  defaultLocale: 'en',
  localePrefix: 'always',
});
