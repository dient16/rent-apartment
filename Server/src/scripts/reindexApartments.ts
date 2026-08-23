/** Full reindex Mongo -> Elasticsearch. Dev: npm run es:reindex. Deployed: npm run es:reindex:prod. */
import mongoose from 'mongoose';

import ApartmentModel from '@/api/apartment/apartment.model';
import { env } from '@/config/env.config';
import { esClient, reindexAllApartments } from '@/services/apartmentSearch.service';

const run = async () => {
  await mongoose.connect(env.MONGODB_URL);
  const apartments = await ApartmentModel.find().select('title description location').lean();
  const count = await reindexAllApartments(apartments);
  console.log(`Reindexed ${count} apartments into Elasticsearch`);
  await mongoose.disconnect();
  await esClient.close();
};

run().catch((error) => {
  console.error('Reindex failed:', error.message);
  process.exit(1);
});
