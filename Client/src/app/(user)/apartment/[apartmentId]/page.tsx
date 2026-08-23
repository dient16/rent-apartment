import type { Metadata } from 'next';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import ApartmentDetail from '@/views/public/ApartmentDetail';
import {
   fetchApartmentDetail,
   fetchApartmentReviews,
   toQueryString,
} from '@/lib/server-api';

type Params = { apartmentId: string };
type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata({
   params,
   searchParams,
}: {
   params: Promise<Params>;
   searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
   const { apartmentId } = await params;
   const queryString = toQueryString(await searchParams);
   const response = await fetchApartmentDetail(apartmentId, queryString);
   const apartment = response?.data;
   if (!apartment?.title) {
      return { title: 'Apartment — Find House' };
   }

   const location = apartment.location || {};
   const place = [location.district, location.province].filter(Boolean).join(', ');
   const image = apartment.rooms?.[0]?.images?.[0];
   const description = (apartment.description || '')
      .replace(/\s+/g, ' ')
      .slice(0, 160);

   return {
      title: `${apartment.title}${place ? ` — ${place}` : ''} | Find House`,
      description,
      openGraph: {
         title: apartment.title,
         description,
         type: 'website',
         ...(image ? { images: [{ url: image }] } : {}),
      },
   };
}

// Availability and prices depend on the requested dates -> rendered per request
export const dynamic = 'force-dynamic';

export default async function Page({
   params,
   searchParams,
}: {
   params: Promise<Params>;
   searchParams: Promise<SearchParams>;
}) {
   const { apartmentId } = await params;
   const queryString = toQueryString(await searchParams);

   const queryClient = new QueryClient();
   const [detail, reviews] = await Promise.all([
      fetchApartmentDetail(apartmentId, queryString),
      fetchApartmentReviews(apartmentId),
   ]);
   // Same keys the client view uses -> hydrated, no refetch flash
   if (detail) queryClient.setQueryData(['apartment', apartmentId, queryString], detail);
   if (reviews) queryClient.setQueryData(['reviews', apartmentId], reviews);

   return (
      <HydrationBoundary state={dehydrate(queryClient)}>
         <ApartmentDetail />
      </HydrationBoundary>
   );
}
