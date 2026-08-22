import https from 'node:https';

import { StatusCodes } from 'http-status-codes';

import { logger } from '@/server';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 phut — Nominatim gioi han ~1 req/s
const CACHE_MAX_ENTRIES = 500;

interface Suggestion {
  label: string;
  description: string;
  value: string;
}

const cache = new Map<string, { data: Suggestion[]; expires: number }>();

/** GET JSON over plain node https */
const fetchJson = (url: string): Promise<any> =>
  new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            'User-Agent': 'RentApartment/1.0 (contact: info@findhouse.vn)',
            'Accept-Language': 'vi',
          },
        },
        (response) => {
          let body = '';
          response.on('data', (chunk) => (body += chunk));
          response.on('end', () => {
            try {
              resolve(JSON.parse(body));
            } catch (error) {
              reject(error);
            }
          });
        }
      )
      .on('error', reject);
  });

const PRIORITY_TYPES = ['hotel', 'motel', 'guest_house', 'village', 'town', 'city', 'district', 'suburb', 'ward'];

const toSuggestion = (place: any): Suggestion => {
  const parts: string[] = String(place.display_name || '')
    .split(',')
    .map((part: string) => part.trim())
    .filter((part: string) => part && part !== 'Việt Nam' && !/^\d{4,6}$/.test(part));

  const label = place.name || parts[0] || '';
  const rest = parts.filter((part) => part !== label);
  const address = place.address || {};
  const cityOrProvince = address.city || address.state || rest[rest.length - 1] || '';

  return {
    label,
    description: rest.join(', '),
    // Compact value shown in the search box: "Name, Province"
    value: [label, cityOrProvince].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join(', '),
  };
};

export const locationService = {
  async suggestAddresses(query: string) {
    const normalized = query.trim().toLowerCase();
    if (normalized.length < 2) {
      return new ServiceResponse(ResponseStatus.Success, 'Suggestions', [], StatusCodes.OK);
    }

    const cached = cache.get(normalized);
    if (cached && cached.expires > Date.now()) {
      return new ServiceResponse(ResponseStatus.Success, 'Suggestions', cached.data, StatusCodes.OK);
    }

    try {
      const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=6&countrycodes=VN`;
      const places: any[] = await fetchJson(url);

      const sorted = [...(places || [])].sort((a, b) => {
        const aPriority = PRIORITY_TYPES.indexOf(a.type);
        const bPriority = PRIORITY_TYPES.indexOf(b.type);
        if (aPriority === -1 && bPriority === -1) return 0;
        if (aPriority === -1) return 1;
        if (bPriority === -1) return -1;
        return aPriority - bPriority;
      });

      const suggestions = sorted.map(toSuggestion).filter((suggestion) => suggestion.label);

      if (cache.size >= CACHE_MAX_ENTRIES) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey) cache.delete(oldestKey);
      }
      cache.set(normalized, { data: suggestions, expires: Date.now() + CACHE_TTL_MS });

      return new ServiceResponse(ResponseStatus.Success, 'Suggestions', suggestions, StatusCodes.OK);
    } catch (error) {
      logger.error(`Address suggest failed: ${(error as Error).message}`);
      return new ServiceResponse(ResponseStatus.Success, 'Suggestions', [], StatusCodes.OK);
    }
  },
};
