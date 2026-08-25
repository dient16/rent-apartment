'use client';

import dynamic from 'next/dynamic';
import { RoomDetailPageSkeleton } from '@/views/host/HostSkeletons';

// CSR like the old SPA (phase 1) — avoids SSR issues with browser-only libs
const HostRoomDetail = dynamic(() => import('@/views/host/HostRoomDetail'), {
   ssr: false,
   loading: () => <RoomDetailPageSkeleton />,
});

export default function Page() {
   return <HostRoomDetail />;
}
