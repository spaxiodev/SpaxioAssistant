import { redirect } from 'next/navigation';

/**
 * Legacy route: "Add account" is now "Team Members".
 * Redirect to the Team Members page.
 */
export default function AddAccountPage() {
  redirect('/dashboard/team');
}
