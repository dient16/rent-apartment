import type { Metadata } from 'next';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import Home from '@/views/public/Home';
import { fetchPopularRooms } from '@/lib/server-api';

export const metadata: Metadata = {
   title: 'Find House — Book apartments & homestays across Vietnam',
   description:
      'Hand-picked apartments and homestays in Da Nang, Nha Trang, Da Lat, Hoi An, Hanoi, Ho Chi Minh City and more — transparent pricing, instant booking.',
   alternates: { canonical: '/' },
};

// Popular rooms are prefetched on the server and revalidated every minute (ISR)
export const revalidate = 60;

export default async function Page() {
   const queryClient = new QueryClient();
   const popular = await fetchPopularRooms();
   if (popular) {
      queryClient.setQueryData(['apartment-popular'], popular);
   }

   return (
      <HydrationBoundary state={dehydrate(queryClient)}>
         <Home />
      </HydrationBoundary>
   );
}
