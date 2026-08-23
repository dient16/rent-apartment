'use client';

import React, { useState } from 'react';
import { FaMinus, FaPlus, FaLocationArrow, FaExternalLinkAlt } from 'react-icons/fa';

interface GoogleMapEmbedProps {
   lat: number;
   lng: number;
   /** Shown as the pin label in Google Maps when available */
   label?: string;
   initialZoom?: number;
   className?: string;
}

const MIN_ZOOM = 10;
const MAX_ZOOM = 20;
const API_KEY = process.env.NEXT_PUBLIC_API_MAP;
// Pixels clipped from the top of the embed (hides Google's link box)
const CROP = 52;

/**
 * Google Maps embed with custom controls. Uses the official Embed API when an
 * API key is configured, otherwise the keyless `output=embed` URL.
 */
const GoogleMapEmbed: React.FC<GoogleMapEmbedProps> = ({
   lat,
   lng,
   label,
   initialZoom = 16,
   className = '',
}) => {
   const [zoom, setZoom] = useState(initialZoom);

   // Center-only views (no Google pin) — our own marker is overlaid at the center
   const src = API_KEY
      ? `https://www.google.com/maps/embed/v1/view?key=${API_KEY}&center=${lat},${lng}&zoom=${zoom}&language=vi`
      : `https://www.google.com/maps?ll=${lat},${lng}&z=${zoom}&hl=vi&output=embed`;
   const openUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

   const controlButton =
      'flex justify-center items-center w-9 h-9 text-gray-700 bg-white transition-colors cursor-pointer hover:bg-blue-50 hover:text-blue-600 disabled:text-gray-300 disabled:cursor-not-allowed';

   return (
      <div className={`overflow-hidden relative w-full h-full ${className}`}>
         {/* The iframe is shifted up by CROP px so Google's own "Open in Maps" box
             (top-left inside the frame) is clipped away; the marker compensates below. */}
         <iframe
            key={zoom}
            title={label ? `Map of ${label}` : 'Map'}
            src={src}
            className="absolute left-0 w-full border-0"
            style={{ top: -CROP, height: `calc(100% + ${CROP}px)` }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
         />

         {/* Custom marker (same pin as the Leaflet map), anchored on the map center */}
         <div
            className="absolute z-10 pointer-events-none"
            style={{ left: 'calc(50% - 20px)', top: `calc(50% - ${CROP / 2 + 50}px)` }}
            aria-hidden
         >
            <div className="map-pin">
               <span className="map-pin-bubble">
                  <svg viewBox="0 0 384 512" width="13" height="13" fill="#fff">
                     <path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z" />
                  </svg>
               </span>
               <span className="map-pin-pulse" />
               <span className="map-pin-dot" />
            </div>
         </div>

         {/* Zoom controls */}
         <div className="flex overflow-hidden absolute right-4 bottom-20 z-10 flex-col rounded-xl border border-gray-100 shadow-lg">
            <button
               type="button"
               aria-label="Zoom in"
               className={`${controlButton} border-b border-gray-100`}
               disabled={zoom >= MAX_ZOOM}
               onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value + 1))}
            >
               <FaPlus size={12} />
            </button>
            <button
               type="button"
               aria-label="Zoom out"
               className={`${controlButton} border-b border-gray-100`}
               disabled={zoom <= MIN_ZOOM}
               onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - 1))}
            >
               <FaMinus size={12} />
            </button>
            <button
               type="button"
               aria-label="Reset view"
               title="Reset view"
               className={controlButton}
               onClick={() => setZoom(initialZoom)}
            >
               <FaLocationArrow size={12} />
            </button>
         </div>

         {/* Styled "open in Google Maps" pill — sits exactly over Google's own link inside the iframe */}
         <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex absolute top-3 left-3 z-10 gap-2 items-center px-4 h-10 text-sm font-semibold text-gray-800 bg-white rounded-full border border-gray-100 shadow-lg"
         >
            <svg viewBox="0 0 384 512" width="12" height="12" fill="currentColor" className="text-blue-600">
               <path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z" />
            </svg>
            Open in Google Maps
            <FaExternalLinkAlt size={10} className="text-gray-400" />
         </a>

      </div>
   );
};

export default GoogleMapEmbed;
