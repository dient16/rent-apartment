'use client';

import dynamic from 'next/dynamic';
import { CreateApartmentPageSkeleton } from '@/views/host/HostSkeletons';

// CSR like the old SPA (phase 1) — avoids SSR issues with browser-only libs
const CreateApartment = dynamic(() => import('@/views/host/CreateApartment'), {
   ssr: false,
   loading: () => <CreateApartmentPageSkeleton />,
});

export default function Page() {
   return <CreateApartment />;
}
