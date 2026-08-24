'use client';

import React, { useEffect, useMemo } from 'react';
import AppImage from '@/components/AppImage/AppImage';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface MapApartment {
   _id: string;
   name: string;
   image?: string;
   price?: number;
   rating?: { ratingAvg?: number; totalRating?: number };
   address?: { district?: string; province?: string };
   coords?: { lat?: number; long?: number };
}

interface ExploreMapProps {
   apartments: MapApartment[];
   detailQuery: string;
}

const priceLabel = (price?: number) =>
   typeof price === 'number' ? `${Math.round(price).toLocaleString()} ₫` : '';

const priceIcon = (price?: number) =>
   L.divIcon({
      className: '',
      // Extra wrapper centers the pill on the coordinate
      html: `<div style="transform: translateX(-50%)"><div class="price-pin">${priceLabel(price)}</div></div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 16],
      popupAnchor: [0, -20],
   });

/** Zoom the map to fit every marker once results are known. */
const FitToMarkers: React.FC<{ points: [number, number][] }> = ({ points }) => {
   const map = useMap();
   useEffect(() => {
      if (!points.length) return;
      map.fitBounds(L.latLngBounds(points), { padding: [56, 56], maxZoom: 15 });
   }, [map, points]);
   return null;
};

/** Leaflet + Carto tiles (no API key required) with a price pill per result. */
const ExploreMap: React.FC<ExploreMapProps> = ({
   apartments,
   detailQuery,
}) => {
   const located = useMemo(
      () =>
         apartments.filter(
            (apartment) =>
               typeof apartment.coords?.lat === 'number' &&
               typeof apartment.coords?.long === 'number',
         ),
      [apartments],
   );

   const points = useMemo(
      () =>
         located.map(
            (apartment) =>
               [apartment.coords!.lat!, apartment.coords!.long!] as [
                  number,
                  number,
               ],
         ),
      [located],
   );

   if (!located.length) {
      return (
         <div className="flex justify-center items-center w-full h-full text-sm text-gray-500 bg-gray-50">
            No mapped locations for these results.
         </div>
      );
   }

   return (
      <MapContainer
         center={points[0]}
         zoom={13}
         className="w-full h-full"
         scrollWheelZoom
      >
         {/* Carto's CDN is reliable where openstreetmap.org tiles are blocked */}
         <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains={['a', 'b', 'c', 'd']}
         />
         <FitToMarkers points={points} />
         {located.map((apartment) => (
            <Marker
               key={apartment._id}
               position={[apartment.coords!.lat!, apartment.coords!.long!]}
               icon={priceIcon(apartment.price)}
            >
               <Popup minWidth={230} maxWidth={260}>
                  <a
                     href={`/apartment/${apartment._id}${detailQuery ? `?${detailQuery}` : ''}`}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="block no-underline font-main"
                  >
                     {apartment.image && (
                        <AppImage
                           src={apartment.image}
                           alt={apartment.name}
                           wrapperClassName="object-cover mb-2 w-full h-28 rounded-lg"
                        />
                     )}
                     <div className="text-sm font-semibold text-gray-900 line-clamp-2">
                        {apartment.name}
                     </div>
                     <div className="mt-0.5 text-xs text-gray-500">
                        {[apartment.address?.district, apartment.address?.province]
                           .filter(Boolean)
                           .join(', ')}
                     </div>
                     <div className="flex gap-2 justify-between items-center mt-2">
                        {apartment.rating?.totalRating ? (
                           <span className="px-1.5 py-0.5 text-xs font-bold text-white bg-blue-500 rounded-md">
                              {apartment.rating.ratingAvg?.toFixed(1)}
                           </span>
                        ) : (
                           <span />
                        )}
                        <span className="text-sm font-bold text-blue-600">
                           {priceLabel(apartment.price)}
                           <span className="ml-1 text-xs font-normal text-gray-400">
                              / night
                           </span>
                        </span>
                     </div>
                  </a>
               </Popup>
            </Marker>
         ))}
      </MapContainer>
   );
};

export default ExploreMap;
