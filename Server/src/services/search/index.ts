import { pino } from 'pino';

import { env } from '@/config/env.config';

import { atlasSearchProvider } from './atlas.provider';
import { elasticsearchProvider } from './elasticsearch.provider';
import type { SearchProvider } from './types';

const logger = pino({ name: 'search' });

const providers: Record<string, SearchProvider> = {
  atlas: atlasSearchProvider,
  elasticsearch: elasticsearchProvider,
};

/** Active backend, picked by SEARCH_PROVIDER. Regex fallback kicks in when it is down. */
export const searchProvider: SearchProvider = providers[env.SEARCH_PROVIDER];

/** Boot hook - never throws, the app runs (regex search) without a backend. */
export const initSearch = async (): Promise<void> => {
  logger.info(`Search provider: ${searchProvider.name}`);
  await searchProvider.init();
};

/** Full-text search -> apartmentIds by relevance; null = fall back to Mongo regex. */
export const searchApartmentIds = (text: string, maxResults = 500, places: string[] = []) =>
  searchProvider.search(text, maxResults, places);

/** Write-through after create/update. No-op on backends that index the collection directly. */
export const indexApartment = (apartment: any) => searchProvider.index(apartment);

/** Write-through after delete. */
export const removeApartmentFromIndex = (apartmentId: string) => searchProvider.remove(apartmentId);

export const reindexAllApartments = (apartments: any[]) => searchProvider.reindexAll(apartments);

export const closeSearch = () => searchProvider.close();
