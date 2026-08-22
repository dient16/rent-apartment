'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/components/PageLoader/PageLoader';

// CSR like the old SPA (phase 1) — avoids SSR issues with browser-only libs
const ApartmentDetail = dynamic(() => import('@/views/public/ApartmentDetail'), { ssr: false, loading: () => <PageLoader /> });

export default function Page() {
   return <ApartmentDetail />;
}
