import type { Metadata } from 'next';
import ResetPassword from '@/views/public/ResetPassword';

export const metadata: Metadata = {
   title: 'Reset password',
   robots: { index: false, follow: false },
};

export default function Page() {
   return <ResetPassword />;
}
