import dns from 'node:dns';
import https from 'node:https';
import type { LookupFunction } from 'node:net';

import { StatusCodes } from 'http-status-codes';

import { env } from '@/config/env.config';
import { logger } from '@/utils/logger';
import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const PHOTON_URL = 'https://photon.komoot.io/api';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 phut — Nominatim gioi han ~1 req/s
const CACHE_MAX_ENTRIES = 500;

interface Suggestion {
  label: string;
  description: string;
  value: string;
}

const cache = new Map<string, { data: Suggestion[]; expires: number }>();

// The search box fires a suggest per keystroke. When the upstream is down (DNS block,
// rate limit, outage) that means one failed round-trip and one error dump per key, so
// back off for a while after a failure instead of hammering it.
const BREAKER_COOLDOWN_MS = 60 * 1000;
const breaker = { openUntil: 0, reported: false };

const REQUEST_TIMEOUT_MS = 5000;

/**
 * Some networks blackhole nominatim.openstreetmap.org at the DNS level — it resolves to
 * 127.0.0.1 and the request dies with ECONNREFUSED. Setting GEOCODER_DNS routes just this
 * host's lookups through the given resolvers, leaving the rest of the process on the OS
 * resolver. Unset (the default) keeps normal behaviour.
 */
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
          // Custom resolver unreachable — fall back to the OS one rather than hard-failing.
          dns.lookup(hostname, options as dns.LookupOptions, callback as never);
          return;
        }
        // Node enables autoSelectFamily by default, which calls lookup with `all: true`
        // and expects an array of entries; returning a bare address yields
        // ERR_INVALID_IP_ADDRESS.
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
          // Nominatim answers rate limiting with an HTML page, so a bare JSON.parse
          // failure here would report a syntax error instead of the real cause.
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

    // Without this a hung upstream would keep the suggest request open indefinitely.
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
    // Compact value shown in the search box: "Name, Province"
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

interface Provider {
  name: string;
  url: (query: string) => string;
  parse: (payload: any) => Suggestion[];
}

/**
 * Nominatim first (it has been the source of this data), Photon as a fallback — some
 * networks block openstreetmap.org outright, and Photon serves the same OSM dataset.
 */
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

    // Every provider is down — back off before the next keystroke tries again.
    breaker.openUntil = Date.now() + BREAKER_COOLDOWN_MS;

    // Node's AggregateError (every address refused/unreachable) carries an empty
    // `message`, so log the object itself plus the per-address causes.
    const code = (lastError as NodeJS.ErrnoException)?.code;
    const causes = (lastError as AggregateError)?.errors?.map(
      (cause: NodeJS.ErrnoException) => `${cause.code ?? cause.name}: ${cause.message}`
    );

    if (breaker.reported) {
      // Already dumped the details for this outage — keep the follow-ups to one line.
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
};
