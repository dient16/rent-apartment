/**
 * Migrate apartment addresses to the post-2025-07-01 administrative structure
 * (63 provinces -> 34, district level abolished, 10.6k wards -> 3.3k).
 *
 *   npm run migrate:address-2025             # dry run: audit + report, writes nothing
 *   npm run migrate:address-2025 -- --apply  # write the resolved addresses
 *   ... -- --geocode                          # also reverse-geocode (Photon/OSM, 1 req/s) to
 *                                             # settle old wards that were split into several new ones
 *   ... -- --only=<apartmentId>               # limit to one document
 *
 * What is written per apartment (only with --apply):
 *   location.province  -> new province name (e.g. "Tỉnh Gia Lai")
 *   location.ward      -> new ward name     (e.g. "Phường Quy Nhơn")
 *   location.district  -> same as the new ward. The app displays and searches
 *                         "district, province" everywhere; with no district level any
 *                         more the ward is the unit right under the province, so keeping
 *                         it here means nothing in the UI/search breaks.
 *   location.legacy    -> { province, district, ward } as they were before
 *   location.adminVersion = 2025
 *
 * A JSON report is always written to Server/migration-reports/.
 */
import fs from 'node:fs';
import path from 'node:path';

import mongoose from 'mongoose';

import ApartmentModel from '@/modules/apartment/apartment.model';
import { env } from '@/config/env.config';

type MappingFile = {
  columns: string[];
  rows: [string, string, string, string, string, string][];
};
type Legacy = {
  provinces: Record<string, string>;
  districts: Record<string, { name: string; province_code: string }>;
  wards: Record<string, { name: string; district_code: string }>;
};
type Candidate = { province: string; ward: string; wardCode: string };
type Status = 'already-new' | 'exact' | 'district-single' | 'district-guess' | 'geocoded' | 'province-only' | 'unresolved';

type Outcome = {
  id: string;
  title: string;
  status: Status;
  before: { province: string; district: string; ward: string };
  after?: { province: string; ward: string };
  candidates?: string[];
  note?: string;
};

const ADMIN_VERSION = 2025;
const DATA_DIR = path.resolve(process.cwd(), 'src/data/vn-admin-2025');
const REPORT_DIR = path.resolve(process.cwd(), 'migration-reports');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const GEOCODE = args.includes('--geocode');
const ONLY = args.find((a) => a.startsWith('--only='))?.slice('--only='.length);

const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8')) as T;

/* ---------- name normalisation ---------- */

const TYPE_PREFIX =
  /^(thanh pho truc thuoc trung uong|thanh pho trung uong|thanh pho|tinh|quan|huyen|thi xa|thi tran|phuong|xa|tp|tx|tt|q|h|p|x)\b\.?\s*/;

/** "Thành Phố Hồ Chí Minh" / "TP. Hồ Chí Minh" / "Hồ Chí Minh" -> "ho chi minh" */
const norm = (value: unknown): string => {
  let s = String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  s = s.replace(TYPE_PREFIX, '');
  // "quan 01" -> "quan 1"
  s = s.replace(/\b0+(\d)/g, '$1');
  return s.replace(/\s+/g, ' ').trim();
};

const isCode = (value: unknown) => /^\d+$/.test(String(value ?? '').trim());

/* ---------- lookup tables ---------- */

const mapping = readJson<MappingFile>('mapping-old-to-new.json');
const legacy = readJson<Legacy>('legacy-gso-2024.json');
const newWards = readJson<{ name_with_type: string; province_code: string }[]>('wards.json');
const newProvinces = readJson<{ code: string; name_with_type: string }[]>('provinces.json');

const byWard = new Map<string, Candidate[]>();
const byDistrict = new Map<string, Map<string, Candidate>>();
const provinceOldToNew = new Map<string, string>();
const newProvinceByNorm = new Map<string, string>();
const newWardsByProvince = new Map<string, Map<string, string>>();

for (const [pOld, dOld, wOld, pNew, wCode, wNew] of mapping.rows) {
  const candidate: Candidate = { province: pNew, ward: wNew, wardCode: wCode };
  const pk = norm(pOld);
  const dk = `${pk}|${norm(dOld)}`;
  const wk = `${dk}|${norm(wOld)}`;
  provinceOldToNew.set(pk, pNew);
  const list = byWard.get(wk) ?? [];
  if (!list.some((c) => c.wardCode === wCode)) list.push(candidate);
  byWard.set(wk, list);
  const dmap = byDistrict.get(dk) ?? new Map<string, Candidate>();
  dmap.set(wCode, candidate);
  byDistrict.set(dk, dmap);
}
for (const p of newProvinces) newProvinceByNorm.set(norm(p.name_with_type), p.name_with_type);
/** VietMap writes "Thành Phố Đà Nẵng"; the app stores "Thành phố Đà Nẵng" - use the provinces.json spelling. */
const canonicalProvince = (name: string) => newProvinceByNorm.get(norm(name)) ?? name;
for (const w of newWards) {
  const provinceName = newProvinces.find((p) => p.code === w.province_code)?.name_with_type ?? '';
  const m = newWardsByProvince.get(norm(provinceName)) ?? new Map<string, string>();
  m.set(norm(w.name_with_type), w.name_with_type);
  newWardsByProvince.set(norm(provinceName), m);
}

/* ---------- decode records that stored GSO codes instead of names ---------- */

const decode = (loc: { province: unknown; district: unknown; ward: unknown }) => {
  let province = String(loc.province ?? '').trim();
  let district = String(loc.district ?? '').trim();
  let ward = String(loc.ward ?? '').trim();
  if (isCode(ward) && legacy.wards[ward]) {
    const w = legacy.wards[ward];
    ward = w.name;
    if (isCode(district) || !district) district = legacy.districts[w.district_code]?.name ?? district;
  }
  if (isCode(district) && legacy.districts[district]) {
    const d = legacy.districts[district];
    district = d.name;
    if (isCode(province) || !province) province = legacy.provinces[d.province_code] ?? province;
  }
  if (isCode(province) && legacy.provinces[province]) province = legacy.provinces[province];
  return { province, district, ward };
};

/* ---------- optional reverse geocoding (Photon / OSM) ---------- */

// Photon (the app's geocoder fallback) already returns post-merger wards, e.g.
// county: "Phường Xuân Hương - Đà Lạt", district: "Sài Gòn". Nominatim is DNS-blackholed
// on some networks (see location.queries.ts), so Photon is the primary source here.
let lastGeocodeAt = 0;
const reverseGeocodeNames = async (lat: number, lon: number): Promise<string[]> => {
  const wait = 1000 - (Date.now() - lastGeocodeAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastGeocodeAt = Date.now();
  try {
    const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&lang=default`;
    const res = await fetch(url, { headers: { 'User-Agent': 'NestStay-address-migration/1.0 (info@neststay.vn)' } });
    if (!res.ok) return [];
    const data = (await res.json()) as { features?: { properties?: Record<string, string> }[] };
    const p = data.features?.[0]?.properties ?? {};
    return [p.county, p.district, p.locality, p.city, p.name].filter(Boolean).map(String);
  } catch {
    return [];
  }
};

/* ---------- resolution ---------- */

const pickByDistrictName = (candidates: Candidate[], districtOld: string): Candidate | null => {
  // "Thành phố Quy Nhơn" -> prefer "Phường Quy Nhơn" over "Phường Quy Nhơn Đông"
  const core = norm(districtOld);
  if (!core) return null;
  const exact = candidates.filter((c) => norm(c.ward) === core);
  if (exact.length === 1) return exact[0];
  const contains = candidates.filter((c) => norm(c.ward).includes(core));
  return contains.length === 1 ? contains[0] : null;
};

const resolve = async (apartment: {
  _id: unknown;
  title?: string;
  location: { province: unknown; district: unknown; ward: unknown; lat?: number; long?: number; adminVersion?: number };
}): Promise<Outcome> => {
  const id = String(apartment._id);
  const title = apartment.title ?? '';
  const before = decode(apartment.location);
  const base: Outcome = { id, title, status: 'unresolved', before };

  if (apartment.location.adminVersion === ADMIN_VERSION) {
    return { ...base, status: 'already-new', note: 'adminVersion already 2025' };
  }

  const pk = norm(before.province);
  const provinceNewRaw = provinceOldToNew.get(pk) ?? newProvinceByNorm.get(pk);
  if (!provinceNewRaw) return { ...base, note: `province "${before.province}" not found in mapping` };
  const provinceNew = canonicalProvince(provinceNewRaw);

  // "district" holding the province name (e.g. "Thành phố Đà Nẵng, Thành phố Đà Nẵng") carries no
  // information - treat it as missing so the geocoder / province-level fallback kicks in.
  if (before.district && norm(before.district) === pk) before.district = '';

  // Already stored in the new structure (e.g. geocoder returned a new ward)?
  const wardsOfNewProvince = newWardsByProvince.get(norm(provinceNew));
  for (const value of [before.ward, before.district]) {
    const hit = value && wardsOfNewProvince?.get(norm(value));
    if (hit && !byDistrict.has(`${pk}|${norm(value)}`)) {
      return { ...base, status: 'already-new', after: { province: provinceNew, ward: hit } };
    }
  }

  const dk = `${pk}|${norm(before.district)}`;
  const districtCandidates = [...(byDistrict.get(dk)?.values() ?? [])];

  // 1. exact old ward
  if (before.ward) {
    const list = byWard.get(`${dk}|${norm(before.ward)}`);
    if (list?.length === 1) return { ...base, status: 'exact', after: { province: provinceNew, ward: list[0].ward } };
    if (list && list.length > 1) {
      const settled = await settle(list, before.district, apartment.location);
      if (settled) return { ...base, ...settled, after: { province: provinceNew, ward: settled.after.ward } };
      return {
        ...base,
        status: 'district-guess',
        after: { province: provinceNew, ward: list[0].ward },
        candidates: list.map((c) => c.ward),
        note: 'old ward was split into several new wards; first candidate used - review',
      };
    }
  }

  // 2. district level
  if (districtCandidates.length === 1) {
    return { ...base, status: 'district-single', after: { province: provinceNew, ward: districtCandidates[0].ward } };
  }
  if (districtCandidates.length > 1) {
    const settled = await settle(districtCandidates, before.district, apartment.location);
    if (settled) return { ...base, ...settled, after: { province: provinceNew, ward: settled.after.ward } };
    return {
      ...base,
      status: 'district-guess',
      after: { province: provinceNew, ward: districtCandidates[0].ward },
      candidates: districtCandidates.map((c) => c.ward),
      note: before.ward ? `ward "${before.ward}" not in mapping` : 'no ward stored; first candidate of the district used - review',
    };
  }

  // 3. province only - with --geocode try to place it by coordinates among all wards of the new province
  if (GEOCODE && typeof apartment.location.lat === 'number' && typeof apartment.location.long === 'number') {
    const geoNames = (await reverseGeocodeNames(apartment.location.lat, apartment.location.long)).map(norm);
    const hit = geoNames.map((n) => wardsOfNewProvince?.get(n)).find(Boolean);
    if (hit) return { ...base, status: 'geocoded', after: { province: provinceNew, ward: hit }, note: 'placed by reverse geocoding' };
  }
  return {
    ...base,
    status: 'province-only',
    after: { province: provinceNew, ward: before.district || before.ward },
    note: `district "${before.district}" not found in mapping; province updated, district/ward kept`,
  };
};

/** Try to pick one of several candidates: by old district name, then (optionally) by reverse geocoding. */
const settle = async (
  candidates: Candidate[],
  districtOld: string,
  loc: { lat?: number; long?: number }
): Promise<{ status: Status; after: { ward: string }; candidates: string[]; note?: string } | null> => {
  const names = candidates.map((c) => c.ward);
  const byName = pickByDistrictName(candidates, districtOld);
  if (byName) return { status: 'district-single', after: { ward: byName.ward }, candidates: names, note: 'picked by old district name' };
  if (GEOCODE && typeof loc.lat === 'number' && typeof loc.long === 'number') {
    const geoNames = (await reverseGeocodeNames(loc.lat, loc.long)).map(norm);
    const hit = candidates.find((c) => geoNames.includes(norm(c.ward)));
    if (hit) return { status: 'geocoded', after: { ward: hit.ward }, candidates: names, note: 'picked by reverse geocoding' };
  }
  return null;
};

/* ---------- main ---------- */

const run = async () => {
  await mongoose.connect(env.MONGODB_URL);
  const filter = ONLY ? { _id: ONLY } : {};
  const apartments = await ApartmentModel.find(filter).select('title location').lean();
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} - ${apartments.length} apartments${GEOCODE ? ' (with reverse geocoding)' : ''}`);

  const outcomes: Outcome[] = [];
  for (const apartment of apartments) {
    outcomes.push(await resolve(apartment as Parameters<typeof resolve>[0]));
  }

  const counts = outcomes.reduce<Record<string, number>>((acc, o) => ({ ...acc, [o.status]: (acc[o.status] ?? 0) + 1 }), {});
  console.table(counts);

  const writable = outcomes.filter((o) => o.after && o.status !== 'already-new' && o.status !== 'unresolved');
  if (APPLY) {
    let written = 0;
    for (const o of writable) {
      await ApartmentModel.updateOne(
        { _id: o.id },
        {
          $set: {
            'location.province': o.after!.province,
            'location.district': o.after!.ward,
            'location.ward': o.after!.ward,
            'location.legacy': o.before,
            'location.adminVersion': ADMIN_VERSION,
          },
        }
      );
      written += 1;
    }
    // Stamp the ones that were already in the new structure so they are skipped next time.
    const alreadyNew = outcomes.filter((o) => o.status === 'already-new' && o.after);
    for (const o of alreadyNew) {
      await ApartmentModel.updateOne(
        { _id: o.id },
        { $set: { 'location.ward': o.after!.ward, 'location.district': o.after!.ward, 'location.adminVersion': ADMIN_VERSION } }
      );
    }
    console.log(`Updated ${written} apartments (+${alreadyNew.length} stamped as already new).`);
    console.log('Next: npm run search:reindex  (the search index still holds the old names)');
  } else {
    console.log(`Would update ${writable.length} apartments. Re-run with --apply to write.`);
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
          (o.after ? ` -> ${o.after.ward}, ${o.after.province}` : '') +
          (o.candidates ? ` | candidates: ${o.candidates.join(' / ')}` : '') +
          (o.note ? ` | ${o.note}` : '')
      );
    }
    if (review.length > 40) console.log(`  ... ${review.length - 40} more in the report`);
  }

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
