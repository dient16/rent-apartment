'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { message } from 'antd';
import { useAuth, useIsHydrated } from '@/hooks';
import { path } from '@/utils/constant';
import ChatHeader from '@/components/ChatApp/ChatHeader';

/**
 * /chat lives outside the marketing site: its own header, no footer, the whole
 * viewport locked so only the message list scrolls. Requires a signed-in user -
 * signing out from the account menu sends you back to the site.
 */
export default function ChatLayout({ children }: { children: React.ReactNode }) {
   const router = useRouter();
   const checked = useIsHydrated();
   const { isAuthenticated } = useAuth();
   // token check for the first paint, then the live auth state (covers logout)
   const signedIn = checked ? isAuthenticated || !!localStorage.getItem('ACCESS_TOKEN') : true;

   useEffect(() => {
      if (checked && !signedIn) {
         message.info('Please sign in to use chat');
         router.replace(`/${path.HOME}`);
      }
   }, [checked, signedIn, router]);

   if (checked && !signedIn) return null;

   return (
      <div className="flex flex-col w-full bg-gray-50 h-dvh overflow-hidden font-main">
         <ChatHeader />
         <div className="flex-1 min-h-0 w-full">{children}</div>
      </div>
   );
}
