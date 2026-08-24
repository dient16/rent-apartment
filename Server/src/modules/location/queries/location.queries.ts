import dns from 'node:dns';
import https from 'node:https';
import type { LookupFunction } from 'node:net';

import { StatusCodes } from 'http-status-codes';

import { env } from '@/config/env.config';
import { logger } from '@/utils/logger';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const PHOTON_URL = 'https://photon.komoot.io/api';
const PHOTON_REVERSE_URL = 'https://photon.komoot.io/reverse';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 phut — Nominatim gioi han ~1 req/s
const CACHE_MAX_ENTRIES = 500;

interface Suggestion {
  label: string;
  description: string;
  value: string;
}

const cache = new Map<string, { data: Suggestion[]; expires: number }>();

// One suggest per keystroke: back off after a failure.
const BREAKER_COOLDOWN_MS = 60 * 1000;
const breaker = { openUntil: 0, reported: false };

const REQUEST_TIMEOUT_MS = 5000;

/** Routes only geocoder lookups through GEOCODER_DNS, for networks that blackhole nominatim. */
const geocoderResolver = (() => {
  const servers = env.GEOCODER_DNS.split(',')
    .map((server) => server.trim())
    .filter(Boolean);
  if (!servers.length) return null;

  const resolver = new dns.Resolver();
  resolver.setServers(servers);
  logger.info({ servers }, 'Geocoder lookups routed through custom DNS');
  return resolver;
})();

const lookup: LookupFunction | undefined = geocoderResolver
  ? (hostname, options, callback) => {
      geocoderResolver.resolve4(hostname, (error, addresses) => {
        if (error || !addresses?.length) {
          // Custom resolver unreachable - fall back to the OS one.
          dns.lookup(hostname, options as dns.LookupOptions, callback as never);
          return;
        }
        // autoSelectFamily expects an array of entries, not a bare address.
        if ((options as dns.LookupOptions).all) {
          (callback as unknown as (err: null, result: dns.LookupAddress[]) => void)(
            null,
            addresses.map((address) => ({ address, family: 4 }))
          );
          return;
        }
        callback(null, addresses[0], 4);
      });
    }
  : undefined;

/** GET JSON over plain node https */
const fetchJson = (url: string): Promise<any> =>
  new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          'User-Agent': 'RentApartment/1.0 (contact: info@findhouse.vn)',
          'Accept-Language': 'vi',
        },
        timeout: REQUEST_TIMEOUT_MS,
        ...(lookup ? { lookup } : {}),
      },
      (response) => {
        let body = '';
        response.on('data', (chunk) => (body += chunk));
        response.on('end', () => {
          // Rate limiting answers with HTML; report that, not a JSON syntax error.
          if (response.statusCode && response.statusCode >= 400) {
            reject(new Error(`Nominatim responded ${response.statusCode}: ${body.slice(0, 120)}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error(`Nominatim returned non-JSON body: ${body.slice(0, 120)}`));
          }
        });
      }
    );

    // A hung upstream would otherwise keep the request open forever.
    request.on('timeout', () => {
      request.destroy(new Error(`Nominatim timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });
    request.on('error', reject);
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
    // Compact value for the search box: "Name, Province".
    value: [label, cityOrProvince].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join(', '),
  };
};

/** Photon (Komoot) returns OSM data as GeoJSON with already-localised names. */
const toPhotonSuggestion = (feature: any): Suggestion => {
  const props = feature?.properties || {};
  const label: string = props.name || '';
  const parts = [props.street, props.district, props.city, props.county, props.state]
    .filter(Boolean)
    .filter((part: string) => part !== label)
    .filter((part: string, index: number, arr: string[]) => arr.indexOf(part) === index);
  const cityOrProvince = props.city || props.state || '';

  return {
    label,
    description: parts.join(', '),
    value: [label, cityOrProvince].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join(', '),
  };
};

const sortByPriority = <T,>(items: T[], typeOf: (item: T) => string) =>
  [...items].sort((a, b) => {
    const aPriority = PRIORITY_TYPES.indexOf(typeOf(a));
    const bPriority = PRIORITY_TYPES.indexOf(typeOf(b));
    if (aPriority === -1 && bPriority === -1) return 0;
    if (aPriority === -1) return 1;
    if (bPriority === -1) return -1;
    return aPriority - bPriority;
  });


/** Place with coordinates + administrative parts, for the map picker. */
interface GeoPlace {
  label: string;
  description: string;
  lat: number;
  lon: number;
  province: string;
  district: string;
  ward: string;
}

const toGeoPlace = (place: any): GeoPlace => {
  const address = place.address || {};
  const parts = String(place.display_name || '')
    .split(',')
    .map((part: string) => part.trim())
    .filter(Boolean);

  return {
    label: place.name || parts[0] || '',
    description: parts.join(', '),
    lat: Number(place.lat),
    lon: Number(place.lon),
    province: address.state || address.city || '',
    district: address.county || address.city_district || address.district || address.town || address.city || '',
    ward: address.quarter || address.suburb || address.village || address.town || '',
  };
};

const toPhotonGeoPlace = (feature: any): GeoPlace => {
  const props = feature?.properties || {};
  const [lon, lat] = feature?.geometry?.coordinates || [];

  return {
    label: props.name || '',
    description: [props.street, props.district, props.city, props.county, props.state].filter(Boolean).join(', '),
    lat: Number(lat),
    lon: Number(lon),
    province: props.state || props.city || '',
    district: props.county || props.district || props.city || '',
    ward: props.district || props.locality || '',
  };
};

const isUsablePlace = (place: GeoPlace) => Boolean(place.label) && Number.isFinite(place.lat) && Number.isFinite(place.lon);

/** Runs the geocoder providers in order and returns the first one that answers. */
const firstProviderResult = async <T,>(
  attempts: { name: string; run: () => Promise<T | null> }[],
  context: Record<string, unknown>
): Promise<T | null> => {
  for (const attempt of attempts) {
    try {
      const result = await attempt.run();
      if (result) return result;
    } catch (error) {
      logger.debug({ err: error, provider: attempt.name, ...context }, 'Geocoding provider failed, trying the next one');
    }
  }
  return null;
};

interface Provider {
  name: string;
  url: (query: string) => string;
  parse: (payload: any) => Suggestion[];
}

/** Nominatim first, Photon (same OSM dataset) as fallback when openstreetmap.org is blocked. */
const PROVIDERS: Provider[] = [
  {
    name: 'nominatim',
    url: (query) =>
      `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=6&countrycodes=VN`,
    parse: (payload) =>
      sortByPriority<any>(payload || [], (place) => place.type)
        .map(toSuggestion)
        .filter((suggestion) => suggestion.label),
  },
  {
    name: 'photon',
    url: (query) => `${PHOTON_URL}?q=${encodeURIComponent(query)}&limit=10`,
    parse: (payload) =>
      sortByPriority<any>(
        (payload?.features || []).filter((feature: any) => feature?.properties?.countrycode === 'VN'),
        (feature) => feature?.properties?.osm_value
      )
        .map(toPhotonSuggestion)
        .filter((suggestion) => suggestion.label)
        .slice(0, 6),
  },
];

/** Location lookups are pure reads against external geocoders - all queries, no repository. */
export const locationQueries = {
  async suggestAddresses(query: string) {
    const normalized = query.trim().toLowerCase();
    if (normalized.length < 2) {
      return new ServiceResponse(ResponseStatus.Success, 'Suggestions', [], StatusCodes.OK);
    }

    const cached = cache.get(normalized);
    if (cached && cached.expires > Date.now()) {
      return new ServiceResponse(ResponseStatus.Success, 'Suggestions', cached.data, StatusCodes.OK);
    }

    if (Date.now() < breaker.openUntil) {
      return new ServiceResponse(ResponseStatus.Success, 'Suggestions', [], StatusCodes.OK);
    }

    let lastError: unknown;

    for (const provider of PROVIDERS) {
      try {
        const suggestions = provider.parse(await fetchJson(provider.url(query)));

        if (cache.size >= CACHE_MAX_ENTRIES) {
          const oldestKey = cache.keys().next().value;
          if (oldestKey) cache.delete(oldestKey);
        }
        cache.set(normalized, { data: suggestions, expires: Date.now() + CACHE_TTL_MS });
        breaker.reported = false;

        return new ServiceResponse(ResponseStatus.Success, 'Suggestions', suggestions, StatusCodes.OK);
      } catch (error) {
        lastError = error;
        logger.debug(
          { err: error, provider: provider.name, query: normalized },
          'Geocoding provider failed, trying the next one'
        );
      }
    }

    // Every provider is down - back off before the next keystroke.
    breaker.openUntil = Date.now() + BREAKER_COOLDOWN_MS;

    // AggregateError has an empty `message`; log the object and its causes.
    const code = (lastError as NodeJS.ErrnoException)?.code;
    const causes = (lastError as AggregateError)?.errors?.map(
      (cause: NodeJS.ErrnoException) => `${cause.code ?? cause.name}: ${cause.message}`
    );

    if (breaker.reported) {
      // Details already logged for this outage.
      logger.warn({ code, query: normalized }, 'Address suggest still failing, backing off');
    } else {
      breaker.reported = true;
      logger.error(
        {
          err: lastError,
          code,
          causes,
          query: normalized,
          providers: PROVIDERS.map((provider) => provider.name),
          retryInMs: BREAKER_COOLDOWN_MS,
        },
        'Address suggest failed on every provider'
      );
    }

    return new ServiceResponse(ResponseStatus.Success, 'Suggestions', [], StatusCodes.OK);
  },

  /** Forward geocoding with coordinates, for the create-listing map picker. */
  async geocode(query: string) {
    const normalized = query.trim();
    if (normalized.length < 2) {
      return new ServiceResponse(ResponseStatus.Success, 'Places', [], StatusCodes.OK);
    }

    const places = await firstProviderResult<GeoPlace[]>(
      [
        {
          name: 'nominatim',
          run: async () => {
            const payload = await fetchJson(
              `${NOMINATIM_URL}?q=${encodeURIComponent(normalized)}&format=json&addressdetails=1&limit=6&countrycodes=VN`
            );
            const results = (payload || []).map(toGeoPlace).filter(isUsablePlace);
            return results.length ? results : null;
          },
        },
        {
          name: 'photon',
          run: async () => {
            const payload = await fetchJson(`${PHOTON_URL}?q=${encodeURIComponent(normalized)}&limit=10`);
            const results = (payload?.features || [])
              .filter((feature: any) => feature?.properties?.countrycode === 'VN')
              .map(toPhotonGeoPlace)
              .filter(isUsablePlace)
              .slice(0, 6);
            return results.length ? results : null;
          },
        },
      ],
      { query: normalized }
    );

    return new ServiceResponse(ResponseStatus.Success, 'Places', places ?? [], StatusCodes.OK);
  },

  /** Reverse geocoding for a point the host clicked on the map. */
  async reverseGeocode(lat: number, lon: number) {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return new ServiceResponse(ResponseStatus.Failed, 'Invalid coordinates', null, StatusCodes.BAD_REQUEST);
    }

    const place = await firstProviderResult<GeoPlace>(
      [
        {
          name: 'nominatim',
          run: async () => {
            const payload = await fetchJson(
              `${NOMINATIM_REVERSE_URL}?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=vi`
            );
            const result = payload?.address ? toGeoPlace({ ...payload, lat, lon }) : null;
            return result?.description ? result : null;
          },
        },
        {
          name: 'photon',
          run: async () => {
            const payload = await fetchJson(`${PHOTON_REVERSE_URL}?lat=${lat}&lon=${lon}&limit=1`);
            const feature = payload?.features?.[0];
            if (!feature) return null;
            const result = toPhotonGeoPlace(feature);
            return { ...result, lat, lon };
          },
        },
      ],
      { lat, lon }
    );

    if (!place) {
      return new ServiceResponse(ResponseStatus.Success, 'Address', null, StatusCodes.OK);
    }

    return new ServiceResponse(ResponseStatus.Success, 'Address', place, StatusCodes.OK);
  },
};
