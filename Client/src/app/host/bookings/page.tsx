'use client';

import dynamic from 'next/dynamic';
import { BookingsPageSkeleton } from '@/views/host/HostSkeletons';

// CSR like the old SPA (phase 1) — avoids SSR issues with browser-only libs
const HostBookings = dynamic(() => import('@/views/host/HostBookings'), {
   ssr: false,
   loading: () => <BookingsPageSkeleton />,
});

export default function Page() {
   return <HostBookings />;
}
