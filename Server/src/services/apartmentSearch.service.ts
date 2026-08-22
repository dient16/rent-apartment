import { Client } from '@elastic/elasticsearch';
import { pino } from 'pino';

import type { Apartment } from '@/api/apartment/apartment.dto';
import { env } from '@/config/env.config';

const logger = pino({ name: 'elasticsearch' });

export const APARTMENT_INDEX = 'apartments';

export const esClient = new Client({ node: env.ELASTICSEARCH_URL });

// ES co the chua san sang / khong bat (dev khong chay docker):
// moi ham deu fail-soft de search API fallback ve regex tren Mongo.
let esAvailable = false;

export const isEsAvailable = () => esAvailable;

/**
 * Mapping: custom analyzer `vi_folding` = lowercase + asciifolding
 * -> "Đà Nẵng" duoc danh index thanh "da nang", nguoi dung go khong dau van khop.
 */
const INDEX_SETTINGS = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
    analysis: {
      analyzer: {
        vi_folding: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'asciifolding'],
        },
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
        },
      },
    },
  },
} as const;

const toEsDocument = (apartment: any) => ({
  title: apartment.title,
  description: apartment.description,
  location: {
    province: apartment.location?.province,
    district: apartment.location?.district,
    ward: apartment.location?.ward,
    street: apartment.location?.street,
    ...(apartment.location?.lat != null && apartment.location?.long != null
      ? { geo: { lat: apartment.location.lat, lon: apartment.location.long } }
      : {}),
  },
});

/** Goi mot lan khi server boot: tao index neu chua co. Khong chan app neu ES chua len. */
export const initApartmentIndex = async (): Promise<void> => {
  try {
    const exists = await esClient.indices.exists({ index: APARTMENT_INDEX });
    if (!exists) {
      await esClient.indices.create({ index: APARTMENT_INDEX, ...(INDEX_SETTINGS as any) });
      logger.info(`Created Elasticsearch index "${APARTMENT_INDEX}"`);
    }
    esAvailable = true;
    logger.info('Elasticsearch connected');
  } catch (error) {
    esAvailable = false;
    logger.warn(`Elasticsearch unavailable, search falls back to MongoDB regex: ${(error as Error).message}`);
    // Tu dong thu lai: ES co the duoc bat sau khi server da chay
    setTimeout(() => initApartmentIndex(), 30_000).unref();
  }
};

/** Index (upsert) mot apartment — goi sau khi create/update. */
export const indexApartment = async (apartment: Apartment & { _id: unknown }): Promise<void> => {
  if (!esAvailable) return;
  try {
    await esClient.index({
      index: APARTMENT_INDEX,
      id: String(apartment._id),
      document: toEsDocument(apartment),
    });
  } catch (error) {
    logger.error(`Failed to index apartment ${apartment._id}: ${(error as Error).message}`);
  }
};

/** Xoa apartment khoi index — goi sau khi delete. */
export const removeApartmentFromIndex = async (apartmentId: string): Promise<void> => {
  if (!esAvailable) return;
  try {
    await esClient.delete({ index: APARTMENT_INDEX, id: apartmentId });
  } catch (error) {
    if ((error as any)?.meta?.statusCode !== 404) {
      logger.error(`Failed to remove apartment ${apartmentId} from index: ${(error as Error).message}`);
    }
  }
};

/**
 * Full-text search -> tra ve danh sach apartmentId (theo do relevance).
 * fuzziness AUTO: chiu duoc go sai 1-2 ky tu ("danag" van ra "Da Nang").
 * Tra ve null khi ES khong san sang de caller fallback ve regex.
 */
export const searchApartmentIds = async (searchText: string, maxResults = 500): Promise<string[] | null> => {
  if (!esAvailable) return null;
  try {
    const result = await esClient.search({
      index: APARTMENT_INDEX,
      size: maxResults,
      _source: false,
      query: {
        multi_match: {
          query: searchText,
          fields: ['title^2', 'location.province', 'location.district', 'location.ward', 'location.street'],
          fuzziness: 'AUTO',
          operator: 'and',
        },
      },
    });
    return result.hits.hits.map((hit) => hit._id);
  } catch (error) {
    logger.error(`Elasticsearch search failed, falling back to regex: ${(error as Error).message}`);
    return null;
  }
};

/** Reindex toan bo apartments tu MongoDB (bulk) — dung cho lan dau va khi mapping doi. */
export const reindexAllApartments = async (apartments: any[]): Promise<number> => {
  const exists = await esClient.indices.exists({ index: APARTMENT_INDEX });
  if (exists) {
    await esClient.indices.delete({ index: APARTMENT_INDEX });
  }
  await esClient.indices.create({ index: APARTMENT_INDEX, ...(INDEX_SETTINGS as any) });

  if (!apartments.length) return 0;

  const operations = apartments.flatMap((apartment) => [
    { index: { _index: APARTMENT_INDEX, _id: String(apartment._id) } },
    toEsDocument(apartment),
  ]);
  const response = await esClient.bulk({ operations, refresh: true });
  if (response.errors) {
    const failed = response.items.filter((item) => item.index?.error);
    logger.error(`Bulk reindex had ${failed.length} failures`);
  }
  esAvailable = true;
  return apartments.length;
};
