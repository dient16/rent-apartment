import React, { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import type { FieldValues, UseFormSetValue } from 'react-hook-form';
import {
   MapContainer,
   TileLayer,
   Marker,
   useMap,
   useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { InputField, SelectField } from '@/components';
import { Provinces } from '@/utils/location/provinces';
import { Districts } from '@/utils/location/districts';
import { Wards } from '@/utils/location/wards';
import { motion } from 'framer-motion';
import { Select, Spin } from 'antd';
import axios from 'axios';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { apiGetAddress } from '@/apis';

/* eslint-disable @typescript-eslint/no-explicit-any */
delete (L.Icon.Default.prototype as any)._getIconUrl;
/* eslint-enable @typescript-eslint/no-explicit-any */
L.Icon.Default.mergeOptions({
   iconRetinaUrl: markerIcon2x,
   iconUrl: markerIcon,
   shadowUrl: markerShadow,
});

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search?';

type LatLng = { lat: number; lng: number };

/**
 * Declared at module scope: defining these inside Step1's render creates a brand new
 * component type on every render, which remounts the map layers each time.
 */
const LocationMarker: React.FC<{ position: LatLng | null }> = ({ position }) => {
   const map = useMap();

   useEffect(() => {
      if (position) {
         map.setView(position, map.getZoom());
      }
   }, [position, map]);

   return position === null ? null : <Marker position={position} />;
};

const LocationMarker1: React.FC<{
   position: LatLng | null;
   setPosition: (value: LatLng) => void;
   setValue: UseFormSetValue<FieldValues>;
}> = ({ position, setPosition, setValue }) => {
   useMapEvents({
      async click(e) {
         setPosition(e.latlng);
         setValue('location.lat', e.latlng.lat);
         setValue('location.long', e.latlng.lng);

         try {
            const response = await apiGetAddress(e.latlng.lat, e.latlng.lng);
            const address = response.data;
            setValue(
               'location.province',
               address.address?.state ?? address.address?.city,
            );
            setValue(
               'location.district',
               address.address?.county ??
                  address.address?.city ??
                  address.address?.suburb ??
                  address.address?.city_district ??
                  address.address?.town,
            );
            setValue(
               'location.ward',

               address.address?.quarter ??
                  address.address?.suburb ??
                  address.address?.village ??
                  address.address?.town,
            );
         } catch (error) {
            console.error(error);
         }
      },
   });

   return position === null ? null : <Marker position={position} />;
};

const Step1: React.FC = () => {
   const { setValue } = useFormContext();
   const [position, setPosition] = useState<{
      lat: number;
      lng: number;
   } | null>(null);

   const [districtsOption, setDistrictsOption] = useState([]);
   const [wardsOption, setWardsOption] = useState([]);
   const [options, setOptions] = useState([]);
   const [loading, setLoading] = useState(false);
   const [searchValue, setSearchValue] = useState('');

   const handleProvinceChange = (selectedProvinceCode: number) => {
      const filteredDistricts = Districts.filter(
         (district) => district.province_code === selectedProvinceCode,
      );
      setDistrictsOption(filteredDistricts);
      setWardsOption([]);
      setValue('location.district', '');
      setValue('location.ward', '');
   };

   const handleDistrictChange = (selectedDistrictCode: number) => {
      const filteredWards = Wards.filter(
         (ward) => ward.district_code === selectedDistrictCode,
      );
      setWardsOption(filteredWards);
      setValue('location.ward', '');
   };

   const handleSearch = async (value: string) => {
      setLoading(true);

      try {
         const response = await axios.get(NOMINATIM_BASE_URL, {
            params: {
               q: value,
               format: 'json',
               addressdetails: 1,
               limit: 5,
               countrycodes: 'VN',
            },
         });

         const results = response.data.map((item: any) => ({
            value: `${item.lat},${item.lon}`,
            label: (
               <>
                  <div className="font-semibold">
                     {item.display_name.split(',')[0]}
                  </div>
                  <div className="text-gray-500">{item.display_name}</div>
               </>
            ),
            title: item.display_name.split(',')[0],
            description: item.display_name,
            address: item.address,
         }));

         setOptions(results);
      } catch (error) {
         console.error('Error fetching address suggestions:', error);
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      const delayDebounceFn = setTimeout(() => {
         if (searchValue) {
            handleSearch(searchValue);
         }
      }, 700);

      return () => clearTimeout(delayDebounceFn);
   }, [searchValue]);

   const handleSelect = (value: string, option: any) => {
      const [lat, lon] = value.split(',');
      setPosition({ lat: parseFloat(lat), lng: parseFloat(lon) });

      setValue('location.lat', parseFloat(lat));
      setValue('location.long', parseFloat(lon));

      const address = option.address;
      setValue('location.province', address?.state ?? address?.city);
      setValue(
         'location.district',
         address?.county ??
            address?.suburb ??
            address?.town ??
            address?.city_district,
      );
      setValue(
         'location.ward',
         address?.quarter ?? address?.village ?? address?.town,
      );
   };

   return (
      <motion.div
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.5 }}
         className="p-6 bg-white"
      >
         <div className="flex flex-col gap-3">
            <InputField
               name="title"
               label="Apartment Name"
               rules={{ required: 'Title is required' }}
            />
            <InputField
               name="description"
               label="Description about the apartment"
               rules={{ required: 'Description is required' }}
               type="textarea"
               rows={4}
            />
         </div>
         <div className="flex flex-col lg:flex-row">
            <div className="lg:w-1/2 lg:pr-6">
               <div className="mb-3">
                  <h4 className="block text-lg font-medium text-gray-700 my-5">
                     Location
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     <InputField
                        name="location.lat"
                        label="Latitude"
                        rules={{ required: 'Latitude is required' }}
                        type="number"
                        className="w-full"
                     />
                     <InputField
                        name="location.long"
                        label="Longitude"
                        rules={{ required: 'Longitude is required' }}
                        type="number"
                        className="w-full"
                     />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                     <SelectField
                        name="location.province"
                        label="Province"
                        options={(Provinces || []).map((province) => {
                           return {
                              label: province.name,
                              value: province.code,
                           };
                        })}
                        onChangeSelected={handleProvinceChange}
                        rules={{ required: 'Province is required' }}
                     />
                     <SelectField
                        name="location.district"
                        label="District"
                        options={(districtsOption || []).map((district) => {
                           return {
                              label: district.name,
                              value: district.code,
                           };
                        })}
                        onChangeSelected={handleDistrictChange}
                        rules={{ required: 'District is required' }}
                     />
                  </div>
                  <div className="grid grid-cols-1 mt-2">
                     <SelectField
                        name="location.ward"
                        label="Ward"
                        options={wardsOption.map((ward) => ({
                           value: ward.code,
                           label: ward.name,
                        }))}
                        rules={{ required: 'Ward is required' }}
                     />
                  </div>
                  <div className="grid grid-cols-1 mt-2">
                     <InputField
                        name="location.street"
                        label="Street Address"
                        rules={{ required: 'Street is required' }}
                     />
                  </div>
               </div>
            </div>
            <div className="lg:w-1/2 lg:pl-6 mt-2 z-0">
               <Select
                  showSearch
                  placeholder="Search for an address"
                  notFoundContent={loading ? <Spin size="small" /> : null}
                  filterOption={false}
                  onSearch={(value) => setSearchValue(value)}
                  onSelect={handleSelect}
                  options={options}
                  size="large"
                  className="my-5 w-full"
                  optionLabelProp="label"
               />
               <div className="mb-4">
                  <p className="text-sm text-gray-500">
                     Click on the map to select your location.
                  </p>
               </div>
               <div className="h-72">
                  <MapContainer
                     center={position || [10.762622, 106.660172]}
                     zoom={13}
                     className="w-full h-full rounded-md shadow-sm"
                  >
                     <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                     <LocationMarker position={position} />
                     <LocationMarker1
                        position={position}
                        setPosition={setPosition}
                        setValue={setValue}
                     />
                  </MapContainer>
               </div>
            </div>
         </div>
      </motion.div>
   );
};

export default Step1;
