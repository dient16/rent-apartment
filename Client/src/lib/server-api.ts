import 'server-only';
import { cache } from 'react';

/**
 * Server-side data access for Server Components (SSR/SEO).
 * Mirrors the client `apis/*` response shapes so React Query can hydrate
 * the exact same query keys on the client without refetching.
 */
const BASE_URL = `${process.env.NEXT_PUBLIC_SERVER_URL}/api`;

type ApiEnvelope<T = unknown> = {
   success: boolean;
   message: string;
   data?: T;
};

const getJson = async <T,>(
   path: string,
   init?: RequestInit & { next?: { revalidate?: number } },
): Promise<ApiEnvelope<T> | null> => {
   try {
      const response = await fetch(`${BASE_URL}${path}`, {
         headers: { Accept: 'application/json' },
         ...init,
      });
      if (!response.ok) return null;
      return (await response.json()) as ApiEnvelope<T>;
   } catch {
      // API unreachable at render time -> the client fetches on mount instead
      return null;
   }
};

/** Popular rooms shown on the home page — revalidated every minute (ISR). */
export const fetchPopularRooms = cache(() =>
   getJson('/apartment/popular-rooms?limit=10', { next: { revalidate: 60 } }),
);

/** Search results — depends on dates/filters, never cached. */
export const fetchSearchRooms = cache((queryString: string) =>
   getJson(`/apartment/search?${queryString}`, { cache: 'no-store' }),
);

/** Apartment detail with availability for the requested dates. */
export const fetchApartmentDetail = cache((apartmentId: string, queryString: string) =>
   getJson<{ title?: string; description?: string; rooms?: { images?: string[] }[]; location?: Record<string, string> }>(
      `/apartment/${apartmentId}?${queryString}`,
      { cache: 'no-store' },
   ),
);

/** Reviews summary + first page (same key the Reviews section uses). */
export const fetchApartmentReviews = cache((apartmentId: string) =>
   getJson(`/review/apartment/${apartmentId}?limit=50`, { next: { revalidate: 60 } }),
);

/** Normalise Next's searchParams object into the same string the client builds. */
export const toQueryString = (
   searchParams: Record<string, string | string[] | undefined>,
): string => {
   const params = new URLSearchParams();
   for (const [key, value] of Object.entries(searchParams)) {
      if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
      else if (value !== undefined) params.set(key, value);
   }
   return params.toString();
};
