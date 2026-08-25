import type { Metadata } from 'next';
import ForgotPassword from '@/views/public/ForgotPassword';

export const metadata: Metadata = {
   title: 'Forgot password',
   description: 'Request a link to reset your Find House password.',
   alternates: { canonical: '/forgot-password' },
   robots: { index: false },
};

export default function Page() {
   return <ForgotPassword />;
}
