import { Client } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { pino } from 'pino';

import { env } from '@/config/env.config';

import type { SearchProvider } from './types';

const logger = pino({ name: 'search:elasticsearch' });

export const APARTMENT_INDEX = 'apartments';

const esClient = new Client({
  node: env.ELASTICSEARCH_URL,
  ...(env.ELASTICSEARCH_API_KEY ? { auth: { apiKey: env.ELASTICSEARCH_API_KEY } } : {}),
});

/** Analyzer `vi_folding` indexes "Đà Nẵng" as "da nang" for unaccented queries. */
const INDEX_SETTINGS = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    analysis: {
      analyzer: {
        vi_folding: { type: 'custom', tokenizer: 'standard', filter: ['lowercase', 'asciifolding'] },
      },
    },
  },
  mappings: {
    properties: {
      title: { type: 'text', analyzer: 'vi_folding' },
      description: { type: 'text', analyzer: 'vi_folding' },
      location: {
        properties: {
          province: { type: 'text', analyzer: 'vi_folding' },
          district: { type: 'text', analyzer: 'vi_folding' },
          ward: { type: 'text', analyzer: 'vi_folding' },
          street: { type: 'text', analyzer: 'vi_folding' },
          geo: { type: 'geo_point' },
          current: {
            properties: {
              province: { type: 'text', analyzer: 'vi_folding' },
              ward: { type: 'text', analyzer: 'vi_folding' },
            },
          },
        },
      },
    },
  },
} as const;

const toDocument = (apartment: any) => ({
  title: apartment.title,
  description: apartment.description,
  location: {
    province: apartment.location?.province,
    district: apartment.location?.district,
    ward: apartment.location?.ward,
    street: apartment.location?.street,
    ...(apartment.location?.current ? { current: apartment.location.current } : {}),
    ...(apartment.location?.lat != null && apartment.location?.long != null
      ? { geo: { lat: apartment.location.lat, lon: apartment.location.long } }
      : {}),
  },
});

let available = false;

export const elasticsearchProvider: SearchProvider = {
  name: 'elasticsearch',

  async init() {
    try {
      const exists = await esClient.indices.exists({ index: APARTMENT_INDEX });
      if (!exists) {
        await esClient.indices.create({ index: APARTMENT_INDEX, ...(INDEX_SETTINGS as any) });
        logger.info(`Created index "${APARTMENT_INDEX}"`);
      }
      available = true;
      logger.info('Elasticsearch connected');
    } catch (error) {
      available = false;
      logger.warn(`Elasticsearch unavailable, falling back to regex: ${(error as Error).message}`);
      // ES may come up after boot.
      setTimeout(() => elasticsearchProvider.init(), 30_000).unref();
    }
  },

  isAvailable: () => available,

  async search(text, maxResults, places = []) {
    if (!available) return null;
    const fields = [
      'title^2',
      'location.province',
      'location.district',
      'location.ward',
      'location.street',
      'location.current.province',
      'location.current.ward',
    ];
    const names = places.map((place) => place.trim()).filter(Boolean);
    const trimmed = text.trim();
    if (!trimmed && !names.length) return null;
    const must: QueryDslQueryContainer[] = [
      // one clause per place: stored or current name
      ...names.map((name): QueryDslQueryContainer => ({ multi_match: { query: name, type: 'phrase', fields } })),
      ...(trimmed ? [{ multi_match: { query: trimmed, fields, fuzziness: 'AUTO', operator: 'and' as const } }] : []),
    ];
    try {
      const result = await esClient.search({
        index: APARTMENT_INDEX,
        size: maxResults,
        _source: false,
        query: { bool: { must } },
      });
      return result.hits.hits.map((hit) => hit._id).filter((id): id is string => Boolean(id));
    } catch (error) {
      logger.error(`Search failed, falling back to regex: ${(error as Error).message}`);
      return null;
    }
  },

  async index(apartment) {
    if (!available) return;
    try {
      await esClient.index({ index: APARTMENT_INDEX, id: String(apartment._id), document: toDocument(apartment) });
    } catch (error) {
      logger.error(`Failed to index apartment ${apartment._id}: ${(error as Error).message}`);
    }
  },

  async remove(apartmentId) {
    if (!available) return;
    try {
      await esClient.delete({ index: APARTMENT_INDEX, id: apartmentId });
    } catch (error) {
      if ((error as any)?.meta?.statusCode !== 404) {
        logger.error(`Failed to remove apartment ${apartmentId}: ${(error as Error).message}`);
      }
    }
  },

  async reindexAll(apartments) {
    const exists = await esClient.indices.exists({ index: APARTMENT_INDEX });
    if (exists) {
      await esClient.indices.delete({ index: APARTMENT_INDEX });
    }
    await esClient.indices.create({ index: APARTMENT_INDEX, ...(INDEX_SETTINGS as any) });

    if (!apartments.length) return 0;

    const operations = apartments.flatMap((apartment) => [
      { index: { _index: APARTMENT_INDEX, _id: String(apartment._id) } },
      toDocument(apartment),
    ]);
    const response = await esClient.bulk({ operations, refresh: true });
    if (response.errors) {
      const failed = response.items.filter((item) => item.index?.error);
      logger.error(`Bulk reindex had ${failed.length} failures`);
    }
    available = true;
    return apartments.length;
  },

  close: () => esClient.close(),
};
