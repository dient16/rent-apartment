'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { message } from 'antd';
import { Footer, Header } from '@/components';
import { useAuth } from '@/hooks';
import { Navigate } from '@/lib/router-compat';
import { path } from '@/utils/constant';

export default function HostLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   const { user } = useAuth();
   const pathname = usePathname() || '';

   // Token guard (client only — no localStorage during SSR)
   const hasToken =
      typeof window !== 'undefined' && !!localStorage.getItem('ACCESS_TOKEN');

   if (typeof window !== 'undefined' && !hasToken) {
      message.info('Please sign in to access the host panel');
      return <Navigate to={`/${path.HOME}`} replace />;
   }

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
         <Footer />
      </div>
   );
}
