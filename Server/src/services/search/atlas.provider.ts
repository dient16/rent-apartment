import mongoose from 'mongoose';
import { pino } from 'pino';

import type { SearchProvider } from './types';

const logger = pino({ name: 'search:atlas' });

/** Must match the Atlas Search index created from atlasIndex.json. */
export const ATLAS_SEARCH_INDEX = 'apartments_search';

const collection = () => mongoose.connection.db!.collection('apartments');

/** Analyzer `vi_folding` indexes "Đà Nẵng" as "da nang"; autocomplete ranks partial input. */
const INDEX_DEFINITION = {
  mappings: {
    dynamic: false,
    fields: {
      title: [
        { type: 'string', analyzer: 'vi_folding' },
        { type: 'autocomplete', analyzer: 'vi_folding', tokenization: 'edgeGram', minGrams: 2, maxGrams: 15 },
      ],
      description: { type: 'string', analyzer: 'vi_folding' },
      location: {
        type: 'document',
        fields: {
          province: [
            { type: 'string', analyzer: 'vi_folding' },
            { type: 'autocomplete', analyzer: 'vi_folding', tokenization: 'edgeGram', minGrams: 2, maxGrams: 15 },
          ],
          district: [
            { type: 'string', analyzer: 'vi_folding' },
            { type: 'autocomplete', analyzer: 'vi_folding', tokenization: 'edgeGram', minGrams: 2, maxGrams: 15 },
          ],
          ward: { type: 'string', analyzer: 'vi_folding' },
          street: { type: 'string', analyzer: 'vi_folding' },
        },
      },
    },
  },
  analyzers: [
    {
      name: 'vi_folding',
      tokenizer: { type: 'standard' },
      tokenFilters: [{ type: 'lowercase' }, { type: 'asciiFolding' }],
    },
  ],
};

const SEARCH_PATHS = ['title', 'location.province', 'location.district', 'location.ward', 'location.street'];

/** ES `fuzziness: AUTO` thresholds: <=2 chars exact, 3-5 one edit, longer two. */
const fuzzyFor = (token: string) =>
  token.length <= 2 ? undefined : { fuzzy: { maxEdits: token.length > 5 ? 2 : 1, prefixLength: 1 } };

let available = false;

/**
 * Atlas Search runs inside the MongoDB cluster and indexes the collection directly,
 * so the write-through hooks are no-ops: nothing to sync, nothing to drift.
 */
export const atlasSearchProvider: SearchProvider = {
  name: 'atlas',

  async init() {
    try {
      // mongoose may still be connecting; wait for the connection this probe needs.
      await mongoose.connection.asPromise();
      const indexes = await collection().listSearchIndexes().toArray();
      const index = indexes.find((idx: any) => idx.name === ATLAS_SEARCH_INDEX);
      if (!index) {
        await collection().createSearchIndex({ name: ATLAS_SEARCH_INDEX, definition: INDEX_DEFINITION });
        logger.info(`Created Atlas Search index "${ATLAS_SEARCH_INDEX}" - building, regex fallback until ready`);
      }
      if (index && !(index as any).queryable) {
        logger.info(`Atlas Search index "${ATLAS_SEARCH_INDEX}" still building, regex fallback until ready`);
      }
      if (index && (index as any).queryable) {
        available = true;
        logger.info(`Atlas Search connected (index "${ATLAS_SEARCH_INDEX}")`);
        return;
      }
      // A new index takes ~a minute to build; recheck instead of failing the boot.
      setTimeout(() => atlasSearchProvider.init(), 30_000).unref();
    } catch (error) {
      // listSearchIndexes only exists on Atlas; plain mongod lands here.
      available = false;
      logger.warn(`Atlas Search unavailable, falling back to regex: ${(error as Error).message}`);
    }
  },

  isAvailable: () => available,

  async search(text, maxResults) {
    if (!available) return null;

    const tokens = text.trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return null;

    try {
      const hits = await collection()
        .aggregate([
          {
            $search: {
              index: ATLAS_SEARCH_INDEX,
              compound: {
                // One `must` per token = ES `operator: and`: every word has to land
                // somewhere, otherwise "da nang" also returns every "Da Lat".
                must: tokens.map((token) => ({
                  compound: {
                    should: [
                      // Whole word with typo tolerance, mirroring ES fuzziness AUTO.
                      { text: { query: token, path: SEARCH_PATHS, ...fuzzyFor(token) } },
                      // Prefix match so a half-typed last word still counts.
                      { autocomplete: { query: token, path: 'title' } },
                      { autocomplete: { query: token, path: 'location.province' } },
                      { autocomplete: { query: token, path: 'location.district' } },
                    ],
                    minimumShouldMatch: 1,
                  },
                })),
                // Ranking only: exact location wins over a fuzzy hit in the description.
                should: [
                  { text: { query: text, path: 'location.province', score: { boost: { value: 5 } } } },
                  { text: { query: text, path: 'location.district', score: { boost: { value: 3 } } } },
                  { text: { query: text, path: 'title', score: { boost: { value: 2 } } } },
                ],
              },
            },
          },
          { $limit: maxResults },
          { $project: { _id: 1 } },
        ])
        .toArray();
      return hits.map((hit) => String(hit._id));
    } catch (error) {
      logger.error(`Atlas Search failed, falling back to regex: ${(error as Error).message}`);
      return null;
    }
  },

  // Atlas indexes the collection itself - the Mongo write IS the index write.
  index: async () => {},
  remove: async () => {},
  reindexAll: async (apartments) => apartments.length,
  close: async () => {},
};
