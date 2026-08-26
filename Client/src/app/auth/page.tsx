import type { Metadata } from 'next';
import { Suspense } from 'react';
import AuthPageClient from './AuthPageClient';

export const metadata: Metadata = {
   title: 'Sign in',
   description:
      'Sign in or create a NestStay account to book apartments and homestays across Vietnam.',
   alternates: { canonical: '/auth' },
   robots: { index: false },
};

export default function Page() {
   return (
      <Suspense>
         <AuthPageClient />
      </Suspense>
   );
}
