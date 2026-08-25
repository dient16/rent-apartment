'use client';

import dynamic from 'next/dynamic';
import HostDashboardSkeleton from '@/views/host/HostDashboardSkeleton';

// CSR like the old SPA (phase 1) — avoids SSR issues with browser-only libs.
// The fallback mirrors the real layout so nothing jumps once the chunk lands.
const HostDashboard = dynamic(() => import('@/views/host/HostDashboard'), {
   ssr: false,
   loading: () => <HostDashboardSkeleton />,
});

export default function Page() {
   return <HostDashboard />;
}
