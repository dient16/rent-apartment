import type { Metadata } from 'next';
import SetPassword from '@/views/public/SetPassword';

export const metadata: Metadata = {
   title: 'Create your password',
   robots: { index: false, follow: false },
};

export default function Page() {
   return <SetPassword />;
}
