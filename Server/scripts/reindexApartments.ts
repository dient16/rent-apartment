/**
 * Reindex toan bo apartments tu MongoDB sang Elasticsearch.
 * Chay: npm run es:reindex  (can Elasticsearch dang chay - docker compose up -d)
 */
import mongoose from 'mongoose';

import ApartmentModel from '@/api/apartment/apartment.model';
import { env } from '@/config/env.config';
import { reindexAllApartments } from '@/services/apartmentSearch.service';

const run = async () => {
  await mongoose.connect(env.MONGODB_URL);
  const apartments = await ApartmentModel.find().select('title description location').lean();
  const count = await reindexAllApartments(apartments);
  console.log(`Reindexed ${count} apartments into Elasticsearch`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error('Reindex failed:', error.message);
  process.exit(1);
});
