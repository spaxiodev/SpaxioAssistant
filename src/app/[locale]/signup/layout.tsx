import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Sign up',
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
