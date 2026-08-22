import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { LatLngExpression } from 'leaflet';

// Custom pin: location bubble above a pulsing blue dot (styles in globals.css)
const PIN_SVG =
   '<svg viewBox="0 0 384 512" width="13" height="13" fill="#fff"><path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/></svg>';
const pinIcon = L.divIcon({
   className: '',
   html: `<div class="map-pin"><span class="map-pin-bubble">${PIN_SVG}</span><span class="map-pin-pulse"></span><span class="map-pin-dot"></span></div>`,
   iconSize: [40, 58],
   iconAnchor: [20, 50],
   popupAnchor: [0, -48],
});

interface Position {
   lat: number;
   lon: number;
}

interface ResetCenterViewProps {
   selectPosition: Position | null;
}

const ResetCenterView: React.FC<ResetCenterViewProps> = ({
   selectPosition,
}) => {
   const map = useMap();

   useEffect(() => {
      if (selectPosition) {
         map.setView(
            L.latLng(selectPosition.lat, selectPosition.lon),
            map.getZoom(),
            {
               animate: true,
            },
         );
      }
   }, [selectPosition, map]);

   return null;
};

interface MapsProps {
   selectPosition: Position | null;
   label?: string;
   description?: string;
}

const Maps: React.FC<MapsProps> = ({ selectPosition, label, description }) => {
   const locationSelection: LatLngExpression = selectPosition
      ? [selectPosition.lat, selectPosition.lon]
      : [51.505, -0.09];
   return (
      <MapContainer
         center={locationSelection}
         zoom={16}
         style={{ width: '100%', height: '100%' }}
      >
         <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
         />
         {selectPosition && (
            <Marker position={locationSelection} icon={pinIcon}>
               {(label || description) && (
                  <Popup>
                     <div style={{ fontFamily: 'inherit', minWidth: 180 }}>
                        {label && (
                           <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{label}</p>
                        )}
                        {description && (
                           <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
                              {description}
                           </p>
                        )}
                     </div>
                  </Popup>
               )}
            </Marker>
         )}
         <ResetCenterView selectPosition={selectPosition} />
      </MapContainer>
   );
};

export default Maps;
