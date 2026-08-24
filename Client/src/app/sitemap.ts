import type { MetadataRoute } from 'next';
import { fetchSearchRooms } from '@/lib/server-api';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:8000';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
   const staticRoutes: MetadataRoute.Sitemap = ['', '/listing', '/about', '/contact'].map(
      (path) => ({
         url: `${SITE_URL}${path}`,
         lastModified: new Date(),
         changeFrequency: 'daily',
         priority: path === '' ? 1 : 0.8,
      }),
   );

   const results = (await fetchSearchRooms('limit=500')) as
      | { data?: { apartments?: { _id: string }[] } }
      | null;
   const apartments = results?.data?.apartments || [];

   return [
      ...staticRoutes,
      ...apartments.map((apartment) => ({
         url: `${SITE_URL}/apartment/${apartment._id}`,
         lastModified: new Date(),
         changeFrequency: 'weekly' as const,
         priority: 0.7,
      })),
   ];
}
