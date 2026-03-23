import { redirect } from 'next/navigation';

/** Assistant behavior and welcome message live under Settings (widget & business). */
export default function AssistantPageRedirect() {
  redirect('/dashboard/settings');
}
