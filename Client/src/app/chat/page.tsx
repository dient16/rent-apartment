'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader/PageLoader';

// Browser-only (sockets, scroll anchoring) - same pattern as the listing messenger.
const ChatApp = dynamic(() => import('@/components/ChatApp/ChatApp'), {
   ssr: false,
   loading: () => <PageLoader />,
});

export default function Page() {
   return <ChatApp />;
}
