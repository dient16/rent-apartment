'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Footer, Header } from '@/components';

export default function UserLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   const pathname = usePathname();

   useEffect(() => {
      window.scrollTo(0, 0);
   }, [pathname]);

   // The messenger fills the viewport — a footer below it only adds scroll
   const isMessenger = pathname?.startsWith('/messages');

   return (
      <div
         className={
            isMessenger
               ? // Lock the whole page to the viewport: header + chat, zero outer scroll
                 'flex z-50 flex-col items-center w-full font-main h-dvh overflow-hidden'
               : 'flex z-50 flex-col justify-center items-center w-full font-main'
         }
      >
         <Header />
         <div
            className={
               isMessenger
                  ? 'w-full flex-1 min-h-0 overflow-hidden'
                  : 'w-full min-h-[calc(100vh-60px)] lg:min-h-[calc(100vh-80px)]'
            }
         >
            {children}
         </div>
         {!isMessenger && <Footer />}
      </div>
   );
}
