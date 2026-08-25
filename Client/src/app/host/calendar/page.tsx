'use client';

import dynamic from 'next/dynamic';
import { CalendarPageSkeleton } from '@/views/host/HostSkeletons';

// CSR like the old SPA (phase 1) — avoids SSR issues with browser-only libs
const HostCalendar = dynamic(() => import('@/views/host/HostCalendar'), {
   ssr: false,
   loading: () => <CalendarPageSkeleton />,
});

export default function Page() {
   return <HostCalendar />;
}
