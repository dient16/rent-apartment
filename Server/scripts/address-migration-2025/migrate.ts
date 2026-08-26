/**
 * Backfill `location.current` ({ province, ward } in the post-2025-07-01 structure) on every
 * apartment. The stored `location.province / district / ward` are NOT changed.
 *
 *   npm run migrate:address-2025                        # dry run: audit + report, writes nothing
 *   npm run migrate:address-2025 -- --apply             # write location.current + adminVersion
 *   npm run migrate:address-2025 -- --apply --geocode   # also settle split wards via Photon (1 req/s)
 *   npm run migrate:address-2025 -- --force             # recompute listings that already have it
 *   npm run migrate:address-2025 -- --only=<apartmentId>
 *
 * New listings get `location.current` on create (apartment.commands.ts); this tool is for the
 * existing ones and for re-running after the mapping data is updated. A JSON report is written to
 * scripts/address-migration-2025/reports/ (git-ignored).
 */
import fs from 'node:fs';
import path from 'node:path';

import mongoose from 'mongoose';

import ApartmentModel from '@/modules/apartment/apartment.model';
import { ADMIN_VERSION, resolveCurrentAddress, type Resolution } from '@/modules/location/addressResolver';
import { env } from '@/config/env.config';

const REPORT_DIR = path.resolve(process.cwd(), 'scripts/address-migration-2025/reports');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const GEOCODE = args.includes('--geocode');
const FORCE = args.includes('--force');
const ONLY = args.find((a) => a.startsWith('--only='))?.slice('--only='.length);

type Outcome = Resolution & { id: string; title: string };

const run = async () => {
  await mongoose.connect(env.MONGODB_URL);
  const filter: Record<string, unknown> = ONLY ? { _id: ONLY } : {};
  if (!FORCE) filter['location.adminVersion'] = { $ne: ADMIN_VERSION };
  const apartments = await ApartmentModel.find(filter).select('title location').lean();
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} - ${apartments.length} apartments${GEOCODE ? ' (with reverse geocoding)' : ''}`);

  const outcomes: Outcome[] = [];
  for (const apartment of apartments as any[]) {
    const resolution = await resolveCurrentAddress(apartment.location, { geocode: GEOCODE });
    outcomes.push({ id: String(apartment._id), title: apartment.title ?? '', ...resolution });
  }

  const counts = outcomes.reduce<Record<string, number>>((acc, o) => ({ ...acc, [o.status]: (acc[o.status] ?? 0) + 1 }), {});
  console.table(counts);

  const writable = outcomes.filter((o) => o.current?.province && o.current.ward);
  if (APPLY) {
    for (const o of writable) {
      await ApartmentModel.updateOne(
        { _id: o.id },
        { $set: { 'location.current': o.current, 'location.adminVersion': ADMIN_VERSION } }
      );
    }
    console.log(`Wrote location.current on ${writable.length} apartments.`);
    console.log('If SEARCH_PROVIDER=elasticsearch: npm run search:reindex');
  } else {
    console.log(`Would write location.current on ${writable.length} apartments. Re-run with --apply to write.`);
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = path.join(REPORT_DIR, `address-2025-${APPLY ? 'apply' : 'dry-run'}-${stamp}.json`);
  fs.writeFileSync(reportFile, JSON.stringify({ apply: APPLY, geocode: GEOCODE, counts, outcomes }, null, 2), 'utf-8');
  console.log(`Report: ${reportFile}`);

  const review = outcomes.filter((o) => o.status === 'district-guess' || o.status === 'province-only' || o.status === 'unresolved');
  if (review.length) {
    console.log(`\n${review.length} need review:`);
    for (const o of review.slice(0, 40)) {
      console.log(
        `- [${o.status}] ${o.id} "${o.title}" | ${o.before.district}, ${o.before.province}` +
          (o.current ? ` -> ${o.current.ward}, ${o.current.province}` : '') +
          (o.candidates ? ` | candidates: ${o.candidates.join(' / ')}` : '') +
          (o.note ? ` | ${o.note}` : '')
      );
    }
    if (review.length > 40) console.log(`  ... ${review.length - 40} more in the report`);
  }

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
