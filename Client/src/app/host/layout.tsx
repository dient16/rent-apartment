'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { message } from 'antd';
import { Footer, Header } from '@/components';
import { useAuth, useIsHydrated } from '@/hooks';
import { Navigate } from '@/lib/router-compat';
import { path } from '@/utils/constant';

export default function HostLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   const { user } = useAuth();
   const router = useRouter();
   const pathname = usePathname() || '';

   // Token guard runs after hydration so the first client render matches the
   // server HTML (localStorage is unavailable during SSR / prerender).
   const checked = useIsHydrated();
   const hasToken = checked ? !!localStorage.getItem('ACCESS_TOKEN') : true;

   useEffect(() => {
      if (checked && !hasToken) {
         message.info('Please sign in to access the host panel');
         router.replace(`/${path.HOME}`);
      }
   }, [checked, hasToken, router]);

   if (checked && !hasToken) return null;

   // First switch to host mode -> welcome page (server-side flag)
   const isWelcomePage = pathname.includes(
      `${path.HOST_ROOT}${path.HOST_WELCOME}`,
   );
   const welcomeSeen = user ? user.hasSeenHostWelcome !== false : true;
   if (!welcomeSeen && !isWelcomePage) {
      return <Navigate to={`${path.HOST_ROOT}${path.HOST_WELCOME}`} replace />;
   }

   return (
      <div className="flex flex-col justify-center items-center w-full font-main">
         <Header isHost={true} />
         <div className="w-full min-h-screen bg-gray-50">{children}</div>
         {!pathname.includes('/host/messages') && <Footer />}
      </div>
   );
}
