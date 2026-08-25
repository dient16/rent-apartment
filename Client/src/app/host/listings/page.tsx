'use client';

import dynamic from 'next/dynamic';
import { ListingsPageSkeleton } from '@/views/host/HostSkeletons';

// CSR like the old SPA (phase 1) — avoids SSR issues with browser-only libs
const HostListings = dynamic(() => import('@/views/host/HostListings'), {
   ssr: false,
   loading: () => <ListingsPageSkeleton />,
});

export default function Page() {
   return <HostListings />;
}
