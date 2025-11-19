import { redirect } from 'next/navigation';

/**
 * Legacy route kept for backwards compatibility. Historically this page
 * asked users to choose a role after authentication. The new flow gathers
 * roles before hitting Clerk, so any direct visits should simply land on
 * the role-aware sign-up experience.
 */
export default function LegacySelectRoleRedirectPage() {
  redirect('/sign-up');
}

