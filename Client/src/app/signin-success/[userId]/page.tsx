import type { Metadata } from 'next';
import LoginSuccess from '@/views/public/LoginSuccess';

export const metadata: Metadata = {
   title: 'Signing in',
   robots: { index: false, follow: false },
};

export default function Page() {
   return <LoginSuccess />;
}
