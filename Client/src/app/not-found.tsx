'use client';

import dynamic from 'next/dynamic';

const NotFound = dynamic(() => import('@/views/public/NotFound'), {
   ssr: false,
});

export default function NotFoundPage() {
   return <NotFound />;
}
