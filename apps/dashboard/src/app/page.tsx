import { redirect } from 'next/navigation';

// Admin console front door; middleware sends unauthenticated visitors to /login.
export default function Index() {
  redirect('/dashboard');
}
