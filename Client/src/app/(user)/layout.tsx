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
   const hideFooter = pathname?.startsWith('/messages');

   return (
      <div className="flex z-50 flex-col justify-center items-center w-full font-main">
         <Header />
         <div className="w-full min-h-[calc(100vh-60px)] lg:min-h-[calc(100vh-80px)]">{children}</div>
         {!hideFooter && <Footer />}
      </div>
   );
}
