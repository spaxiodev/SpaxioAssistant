'use client';

/**
 * Client-only re-export of next-intl Link.
 * Use this instead of importing Link from @/i18n/navigation when the Link is
 * rendered by a Server Component or used with Radix slot (e.g. Button asChild).
 * This avoids "Invalid hook call" / "Cannot read properties of null (reading 'use')"
 * by ensuring the Link implementation always runs on the client.
 */
export { Link } from '@/i18n/navigation';
