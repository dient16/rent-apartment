/**
 * Offline suggestions for the destination box, built from src/data/vn-admin-2025:
 * the 34 provinces and 3 321 wards in force since 2025-07-01, plus the pre-merger
 * province / district names so that a guest who still types "Bình Định" or
 * "Quận Hải Châu" lands on the unit that replaced it.
 *
 * Geocoders (OSM) are the fallback for streets and points of interest only.
 */
import fs from 'node:fs';
import path from 'node:path';

import { logger } from '@/utils/logger';

export interface UnitSuggestion {
  label: string;
  description: string;
  /** What goes into the search box / `province` query param, e.g. "Quy Nhơn, Gia Lai" */
  value: string;
}

interface Entry extends UnitSuggestion {
  /** normalised strings the query is matched against */
  keys: string[];
  /** tie-breaker: province < ward < legacy province < legacy district */
  rank: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'src/data/vn-admin-2025');

const TYPE_PREFIX =
  /^(thanh pho truc thuoc trung uong|thanh pho trung uong|thanh pho|tinh|quan|huyen|thi xa|thi tran|phuong|xa|tp|tx|tt)\b\.?\s*/;

/** lowercase, no diacritics, single spaces: "Tỉnh Bình Định" -> "tinh binh dinh" */
export const fold = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b0+(\d)/g, '$1')
    .trim();

/** fold() without the unit type: "tinh binh dinh" -> "binh dinh" */
export const core = (value: unknown): string => fold(value).replace(TYPE_PREFIX, '').trim();

/** VietMap capitalises every word ("Thành Phố Quy Nhơn"); the app writes "Thành phố Quy Nhơn". */
const tidy = (name: string): string =>
  name
    // (no `\b` here: JS word boundaries do not fire after accented letters)
    .replace(/^Thành Phố(?=\s)/, 'Thành phố')
    .replace(/^Thị Xã(?=\s)/, 'Thị xã')
    .replace(/^Thị Trấn(?=\s)/, 'Thị trấn')
    .replace(/^Đặc Khu(?=\s)/, 'Đặc khu');

let entries: Entry[] | null = null;

const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8')) as T;

const build = (): Entry[] => {
  const provinces = readJson<{ code: string; name: string; name_with_type: string; type: string }[]>('provinces.json');
  const wards = readJson<{ name: string; name_with_type: string; province_code: string }[]>('wards.json');
  const mapping = readJson<{ rows: [string, string, string, string, string, string][] }>('mapping-old-to-new.json');

  const provinceByCode = new Map(provinces.map((p) => [p.code, p]));
  const provinceByCore = new Map(provinces.map((p) => [core(p.name_with_type), p]));
  const result: Entry[] = [];
  const seen = new Set<string>();
  const push = (entry: Entry) => {
    const key = `${fold(entry.label)}|${fold(entry.value)}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(entry);
  };

  for (const p of provinces) {
    push({
      label: p.name_with_type,
      description: p.type === 'thanh-pho' ? 'Thành phố trực thuộc trung ương' : 'Tỉnh',
      value: p.name,
      keys: [core(p.name), fold(p.name_with_type)],
      rank: 0,
    });
  }

  for (const w of wards) {
    const province = provinceByCode.get(w.province_code);
    if (!province) continue;
    push({
      label: tidy(w.name_with_type),
      description: province.name_with_type,
      value: `${w.name}, ${province.name}`,
      keys: [core(w.name), fold(w.name_with_type)],
      // Guests search for towns far more than for rural communes.
      rank: /^(Phường|Đặc khu)/i.test(w.name_with_type) ? 1 : 2,
    });
  }

  // Pre-merger names -> where they are now.
  const oldProvinces = new Map<string, string>(); // old name -> new province core
  const oldDistricts = new Map<string, { provinceOld: string; districtOld: string; provinceNew: string; wards: Set<string> }>();
  for (const [pOld, dOld, , pNew, , wNew] of mapping.rows) {
    oldProvinces.set(pOld, core(pNew));
    const key = `${fold(pOld)}|${fold(dOld)}`;
    const rec = oldDistricts.get(key) ?? { provinceOld: pOld, districtOld: dOld, provinceNew: core(pNew), wards: new Set<string>() };
    rec.wards.add(wNew);
    oldDistricts.set(key, rec);
  }

  for (const [pOld, pNewCore] of oldProvinces) {
    const province = provinceByCore.get(pNewCore);
    if (!province || core(pOld) === pNewCore) continue; // unchanged province
    push({
      label: tidy(pOld),
      description: `Nay thuộc ${province.name_with_type} (sáp nhập 7/2025)`,
      value: province.name,
      keys: [core(pOld), fold(pOld)],
      rank: 1,
    });
  }

  for (const rec of oldDistricts.values()) {
    const province = provinceByCore.get(rec.provinceNew);
    if (!province) continue;
    const districtCore = core(rec.districtOld);
    const candidates = [...rec.wards];
    // "Thành phố Quy Nhơn" -> "Phường Quy Nhơn"; "Quận Hải Châu" -> "Phường Hải Châu"
    const exact = candidates.filter((w) => core(w) === districtCore);
    const contains = candidates.filter((w) => core(w).includes(districtCore));
    const target = exact.length === 1 ? exact[0] : contains.length === 1 ? contains[0] : null;
    const wardShort = target ? target.replace(/^(Phường|Xã|Thị trấn|Đặc khu)\s+/i, '') : null;
    const sameProvince = core(rec.provinceOld) === rec.provinceNew;
    const provinceOld = tidy(rec.provinceOld);
    push({
      label: tidy(rec.districtOld),
      description: target
        ? `${sameProvince ? 'Nay' : `${provinceOld} · nay`} là ${tidy(target)}, ${province.name_with_type}`
        : sameProvince
          ? `Nay chia thành ${candidates.length} phường/xã · ${province.name_with_type}`
          : `${provinceOld} · nay thuộc ${province.name_with_type}`,
      value: target && wardShort ? `${wardShort}, ${province.name}` : province.name,
      keys: [districtCore, fold(rec.districtOld)],
      rank: 3,
    });
  }

  return result;
};

const load = (): Entry[] => {
  if (entries) return entries;
  try {
    entries = build();
    logger.info({ entries: entries.length }, 'Place suggestions loaded');
  } catch (error) {
    entries = [];
    logger.warn({ err: error, dir: DATA_DIR }, 'Place data missing - local suggestions disabled');
  }
  return entries;
};

/** Ranked local matches for a destination query. Empty when the data files are absent. */
export const suggestPlaces = (query: string, limit = 6): UnitSuggestion[] => {
  const stripped = core(query);
  const q = stripped.length >= 2 ? stripped : fold(query);
  if (q.length < 2) return [];

  const scored: { entry: Entry; score: number }[] = [];
  for (const entry of load()) {
    let best = Number.POSITIVE_INFINITY;
    for (const key of entry.keys) {
      if (key === q) best = Math.min(best, 0);
      else if (key.startsWith(q)) best = Math.min(best, 1);
      else if (key.includes(` ${q}`)) best = Math.min(best, 2);
      else if (q.length >= 3 && key.includes(q)) best = Math.min(best, 3);
    }
    if (best !== Number.POSITIVE_INFINITY) scored.push({ entry, score: best * 10 + entry.rank });
  }

  return scored
    .sort((a, b) => a.score - b.score || a.entry.label.length - b.entry.label.length)
    .slice(0, limit)
    .map(({ entry }) => ({ label: entry.label, description: entry.description, value: entry.value }));
};
