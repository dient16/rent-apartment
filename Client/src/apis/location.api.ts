import api from './axiosConfig';

/** Place with coordinates, as returned by the server's geocoder proxy. */
export interface GeoPlace {
   label: string;
   description: string;
   lat: number;
   lon: number;
   province: string;
   district: string;
   ward: string;
}

// The browser cannot reach nominatim.openstreetmap.org directly (blocked/CORS),
// so both directions go through the server, which also handles the fallback provider.
export const apiGetAddress = (lat: number, lng: number): Promise<Res> =>
   api({
      url: '/location/reverse',
      method: 'get',
      params: { lat, lon: lng },
   });

export const apiGeocode = (q: string): Promise<Res> =>
   api({
      url: '/location/geocode',
      method: 'get',
      params: { q },
   });

export interface AddressSuggestion {
   label: string;
   description: string;
   value: string;
}

export const apiSuggestAddress = (q: string): Promise<Res> =>
   api({
      url: '/location/suggest',
      method: 'get',
      params: { q },
   });
