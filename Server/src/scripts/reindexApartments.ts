/** Full reindex Mongo -> search backend. Dev: npm run search:reindex. Deployed: npm run search:reindex:prod. */
import mongoose from 'mongoose';

import ApartmentModel from '@/api/apartment/apartment.model';
import { env } from '@/config/env.config';
import { closeSearch, reindexAllApartments, searchProvider } from '@/services/search';

const run = async () => {
  await mongoose.connect(env.MONGODB_URL);
  const apartments = await ApartmentModel.find().select('title description location').lean();
  const count = await reindexAllApartments(apartments);
  console.log(`Reindexed ${count} apartments (provider: ${searchProvider.name})`);
  await mongoose.disconnect();
  await closeSearch();
};

run().catch((error) => {
  console.error('Reindex failed:', error.message);
  process.exit(1);
});
