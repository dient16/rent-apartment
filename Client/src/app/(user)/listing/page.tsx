import type { Metadata } from 'next';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import Listing from '@/views/public/Listing';
import { fetchSearchRooms, toQueryString } from '@/lib/server-api';

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({
   searchParams,
}: {
   searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
   const { province } = await searchParams;
   const place = typeof province === 'string' && province.trim() ? province.trim() : 'Vietnam';
   return {
      title: `Stays in ${place} — Find House`,
      description: `Apartments, hotels and homestays in ${place}: compare prices, amenities and guest reviews, then book instantly.`,
   };
}

// Results depend on dates and filters -> rendered per request
export const dynamic = 'force-dynamic';

export default async function Page({
   searchParams,
}: {
   searchParams: Promise<SearchParams>;
}) {
   const params = new URLSearchParams(toQueryString(await searchParams));
   if (!params.get('limit')) params.set('limit', '15');
   const queryString = params.toString();

   const queryClient = new QueryClient();
   const results = await fetchSearchRooms(queryString);
   if (results) {
      queryClient.setQueryData(['listing', queryString], results);
   }

   return (
      <HydrationBoundary state={dehydrate(queryClient)}>
         <Listing />
      </HydrationBoundary>
   );
}
