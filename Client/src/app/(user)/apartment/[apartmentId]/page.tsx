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
      return { title: 'Apartment — NestStay' };
   }

   const location = apartment.location || {};
   const place = [location.district, location.province].filter(Boolean).join(', ');
   const image = apartment.rooms?.[0]?.images?.[0];
   const description = (apartment.description || '')
      .replace(/\s+/g, ' ')
      .slice(0, 160);

   return {
      title: `${apartment.title}${place ? ` — ${place}` : ''}`,
      description,
      // Availability query params produce duplicate URLs — canonicalize to the bare page
      alternates: { canonical: `/apartment/${apartmentId}` },
      openGraph: {
         title: apartment.title,
         description,
         type: 'website',
         url: `/apartment/${apartmentId}`,
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

   // Rich result (LodgingBusiness + rating) for Google
   const apartment = (detail as any)?.data;
   // The reviews list is paginated - use the precomputed totals instead
   const reviewData = (reviews as any)?.data;
   const totalReviews: number = reviewData?.totalReviews || 0;
   const ratingAvg: number | null = totalReviews ? reviewData?.averageRating || null : null;
   const prices = (apartment?.rooms || [])
      .map((room: any) => room?.price)
      .filter((price: any) => typeof price === 'number');
   const jsonLd = apartment
      ? {
           '@context': 'https://schema.org',
           '@type': 'LodgingBusiness',
           name: apartment.title,
           description: (apartment.description || '').replace(/\s+/g, ' ').slice(0, 300),
           image: apartment.rooms?.[0]?.images?.slice(0, 3) || [],
           address: {
              '@type': 'PostalAddress',
              streetAddress: apartment.location?.street,
              addressLocality: apartment.location?.district,
              addressRegion: apartment.location?.province,
              addressCountry: 'VN',
           },
           ...(apartment.location?.lat
              ? {
                   geo: {
                      '@type': 'GeoCoordinates',
                      latitude: apartment.location.lat,
                      longitude: apartment.location.long,
                   },
                }
              : {}),
           ...(prices.length
              ? { priceRange: `${Math.min(...prices).toLocaleString()} - ${Math.max(...prices).toLocaleString()} VND` }
              : {}),
           ...(ratingAvg
              ? {
                   aggregateRating: {
                      '@type': 'AggregateRating',
                      ratingValue: ratingAvg,
                      reviewCount: totalReviews,
                      bestRating: 5,
                   },
                }
              : {}),
        }
      : null;

   return (
      <HydrationBoundary state={dehydrate(queryClient)}>
         {jsonLd && (
            <script
               type="application/ld+json"
               dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
         )}
         <ApartmentDetail />
      </HydrationBoundary>
   );
}
