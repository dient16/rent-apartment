'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthLayout, { type AuthTab } from '@/components/Auth/AuthLayout';

const AuthPageClient: React.FC = () => {
   const router = useRouter();
   const searchParams = useSearchParams();
   const activeTab: AuthTab =
      searchParams?.get('tab') === 'signup' ? 'signup' : 'signin';

   const switchTab = (tab: AuthTab) =>
      router.replace(tab === 'signup' ? '/auth?tab=signup' : '/auth');

   return (
      <div className="w-screen h-dvh">
         <AuthLayout
            activeTab={activeTab}
            onSwitchTab={switchTab}
            onClose={() => router.push('/')}
            // Signing in on the page goes straight home, logged in
            onSignedIn={() => {
               window.location.href = '/';
            }}
            // The page has no modal to close — a no-op keeps SignIn's contract
            setModalOpen={() => {}}
         />
      </div>
   );
};

export default AuthPageClient;
