import { redirect } from 'next/navigation';

/** Redirect legacy /dashboard/pricing to Quote Requests → Pricing Rules. */
export default function PricingPageRedirect() {
  redirect('/dashboard/quote-requests/pricing');
}
