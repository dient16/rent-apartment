/**
 * Maps a listing's stored (pre-2025) address to the unit that replaced it after the
 * 2025-07-01 merger: 63 provinces -> 34, districts abolished, 10.6k wards -> 3.3k.
 *
 * Listings keep their original `location` (province / district / ward); the resolved
 * `{ province, ward }` is stored next to it as `location.current` so that search can match
 * either name and the UI can show the new address. Used on apartment create and by the
 * backfill tool in scripts/address-migration-2025/.
 */
import fs from 'node:fs';
import path from 'node:path';

import { core } from './placeSuggestions';

export interface StoredAddress {
  province: string;
  district: string;
  ward?: string;
}
export interface CurrentAddress {
  province: string;
  ward: string;
}
export type ResolveStatus =
  | 'already-new'
  | 'exact'
  | 'district-single'
  | 'district-guess'
  | 'geocoded'
  | 'province-only'
  | 'unresolved';

export interface Resolution {
  status: ResolveStatus;
  /** the pre-2025 triple, with numeric GSO codes decoded to names */
  before: StoredAddress;
  current?: CurrentAddress;
  candidates?: string[];
  note?: string;
}

export const ADMIN_VERSION = 2025;

const DATA_DIR = path.resolve(process.cwd(), 'src/data/vn-admin-2025');
const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8')) as T;

type Candidate = { province: string; ward: string; wardCode: string };
type Legacy = {
  provinces: Record<string, string>;
  districts: Record<string, { name: string; province_code: string }>;
  wards: Record<string, { name: string; district_code: string }>;
};

interface Tables {
  legacy: Legacy;
  byWard: Map<string, Candidate[]>;
  byDistrict: Map<string, Map<string, Candidate>>;
  provinceOldToNew: Map<string, string>;
  newProvinceByCore: Map<string, string>;
  newWardsByProvince: Map<string, Map<string, string>>;
}

let tables: Tables | null = null;

const load = (): Tables => {
  if (tables) return tables;
  const mapping = readJson<{ rows: [string, string, string, string, string, string][] }>('mapping-old-to-new.json');
  const legacy = readJson<Legacy>('legacy-gso-2024.json');
  const newWards = readJson<{ name_with_type: string; province_code: string }[]>('wards.json');
  const newProvinces = readJson<{ code: string; name_with_type: string }[]>('provinces.json');

  const t: Tables = {
    legacy,
    byWard: new Map(),
    byDistrict: new Map(),
    provinceOldToNew: new Map(),
    newProvinceByCore: new Map(),
    newWardsByProvince: new Map(),
  };
  for (const [pOld, dOld, wOld, pNew, wCode, wNew] of mapping.rows) {
    const candidate: Candidate = { province: pNew, ward: wNew, wardCode: wCode };
    const pk = core(pOld);
    const dk = `${pk}|${core(dOld)}`;
    const wk = `${dk}|${core(wOld)}`;
    t.provinceOldToNew.set(pk, pNew);
    const list = t.byWard.get(wk) ?? [];
    if (!list.some((c) => c.wardCode === wCode)) list.push(candidate);
    t.byWard.set(wk, list);
    const dmap = t.byDistrict.get(dk) ?? new Map<string, Candidate>();
    dmap.set(wCode, candidate);
    t.byDistrict.set(dk, dmap);
  }
  for (const p of newProvinces) t.newProvinceByCore.set(core(p.name_with_type), p.name_with_type);
  for (const w of newWards) {
    const provinceName = newProvinces.find((p) => p.code === w.province_code)?.name_with_type ?? '';
    const m = t.newWardsByProvince.get(core(provinceName)) ?? new Map<string, string>();
    m.set(core(w.name_with_type), w.name_with_type);
    t.newWardsByProvince.set(core(provinceName), m);
  }
  tables = t;
  return t;
};

/** VietMap writes "Thành Phố Đà Nẵng"; the app stores "Thành phố Đà Nẵng" - use the provinces.json spelling. */
const canonicalProvince = (name: string) => load().newProvinceByCore.get(core(name)) ?? name;

const isCode = (value: unknown) => /^\d+$/.test(String(value ?? '').trim());

/** Some records stored GSO codes instead of names (old create form) - turn them back into names. */
export const decodeStoredAddress = (loc: { province: unknown; district: unknown; ward?: unknown }): StoredAddress => {
  const { legacy } = load();
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

/* ---------- reverse geocoding (Photon / OSM, already on post-merger units) ---------- */

let lastGeocodeAt = 0;
export const reverseGeocodeNames = async (lat: number, lon: number): Promise<string[]> => {
  const wait = 1000 - (Date.now() - lastGeocodeAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastGeocodeAt = Date.now();
  try {
    const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&lang=default`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NestStay/1.0 (info@neststay.vn)' },
      signal: AbortSignal.timeout(5000),
    });
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
  const c = core(districtOld);
  if (!c) return null;
  const exact = candidates.filter((x) => core(x.ward) === c);
  if (exact.length === 1) return exact[0];
  const contains = candidates.filter((x) => core(x.ward).includes(c));
  return contains.length === 1 ? contains[0] : null;
};

type Settled = { status: ResolveStatus; ward: string; note: string };

/** Pick one of several candidate wards: by the old district's name, then by coordinates. */
const settle = async (
  candidates: Candidate[],
  districtOld: string,
  loc: { lat?: number; long?: number },
  geocode: boolean
): Promise<Settled | null> => {
  const byName = pickByDistrictName(candidates, districtOld);
  if (byName) return { status: 'district-single', ward: byName.ward, note: 'picked by old district name' };
  if (geocode && typeof loc.lat === 'number' && typeof loc.long === 'number') {
    const names = (await reverseGeocodeNames(loc.lat, loc.long)).map(core);
    const hit = candidates.find((c) => names.includes(core(c.ward)));
    if (hit) return { status: 'geocoded', ward: hit.ward, note: 'picked by reverse geocoding' };
  }
  return null;
};

export interface ResolveOptions {
  /** call Photon to settle wards that were split - ~1 request/second, network required */
  geocode?: boolean;
}

/** Where a stored (pre-2025) address is today. Never throws. */
export const resolveCurrentAddress = async (
  location: { province: unknown; district: unknown; ward?: unknown; lat?: number; long?: number },
  { geocode = false }: ResolveOptions = {}
): Promise<Resolution> => {
  const t = load();
  const before = decodeStoredAddress(location);
  const base: Resolution = { status: 'unresolved', before };

  const pk = core(before.province);
  const provinceNewRaw = t.provinceOldToNew.get(pk) ?? t.newProvinceByCore.get(pk);
  if (!provinceNewRaw) return { ...base, note: `province "${before.province}" not found in mapping` };
  const province = canonicalProvince(provinceNewRaw);
  const wardsOfProvince = t.newWardsByProvince.get(core(province));

  // "district" holding the province name carries no information - treat it as missing.
  if (before.district && core(before.district) === pk) before.district = '';

  // Already a post-merger ward (e.g. the geocoder returned one)?
  for (const value of [before.ward, before.district]) {
    const hit = value && wardsOfProvince?.get(core(value));
    if (hit && !t.byDistrict.has(`${pk}|${core(value)}`)) {
      return { ...base, status: 'already-new', current: { province, ward: hit } };
    }
  }

  const dk = `${pk}|${core(before.district)}`;
  const districtCandidates = [...(t.byDistrict.get(dk)?.values() ?? [])];

  // 1. exact old ward
  if (before.ward) {
    const list = t.byWard.get(`${dk}|${core(before.ward)}`);
    if (list?.length === 1) return { ...base, status: 'exact', current: { province, ward: list[0].ward } };
    if (list && list.length > 1) {
      const settled = await settle(list, before.district, location, geocode);
      const candidates = list.map((c) => c.ward);
      if (settled) return { ...base, status: settled.status, current: { province, ward: settled.ward }, candidates, note: settled.note };
      return {
        ...base,
        status: 'district-guess',
        current: { province, ward: list[0].ward },
        candidates,
        note: 'old ward was split into several new wards; first candidate used - review',
      };
    }
  }

  // 2. district level
  if (districtCandidates.length === 1) {
    return { ...base, status: 'district-single', current: { province, ward: districtCandidates[0].ward } };
  }
  if (districtCandidates.length > 1) {
    const settled = await settle(districtCandidates, before.district, location, geocode);
    const candidates = districtCandidates.map((c) => c.ward);
    if (settled) return { ...base, status: settled.status, current: { province, ward: settled.ward }, candidates, note: settled.note };
    return {
      ...base,
      status: 'district-guess',
      current: { province, ward: districtCandidates[0].ward },
      candidates,
      note: before.ward ? `ward "${before.ward}" not in mapping` : 'no ward stored; first candidate of the district used - review',
    };
  }

  // 3. province only - with coordinates, try to place it among all wards of the new province
  if (geocode && typeof location.lat === 'number' && typeof location.long === 'number') {
    const names = (await reverseGeocodeNames(location.lat, location.long)).map(core);
    const hit = names.map((n) => wardsOfProvince?.get(n)).find(Boolean);
    if (hit) return { ...base, status: 'geocoded', current: { province, ward: hit }, note: 'placed by reverse geocoding' };
  }
  return {
    ...base,
    status: 'province-only',
    current: { province, ward: before.district || before.ward || '' },
    note: `district "${before.district}" not found in mapping; province resolved, ward kept as stored`,
  };
};
