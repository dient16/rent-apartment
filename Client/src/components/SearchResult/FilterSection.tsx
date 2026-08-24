import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { apiGetServices } from '@/apis';
import { Button, Slider } from 'antd';
import { StarFilled } from '@ant-design/icons';
import clsx from 'clsx';

const RATING_OPTIONS = [
   { value: 4, label: '4+' },
   { value: 3.5, label: '3.5+' },
   { value: 3, label: '3+' },
];

const BED_TYPES = ['Single', 'Double', 'Queen', 'King'];


interface FilterSectionProps {
   /** Pushes the current filter values into the URL right away. */
   onApply?: (values: Record<string, any>) => void;
}

/** Filters actually sent to the API: price / rating / bed type / amenities */
const FilterSection: React.FC<FilterSectionProps> = ({ onApply }) => {
   const { control, watch, setValue, getValues } = useFormContext();

   const apply = (patch: Record<string, any>) =>
      onApply?.({ ...getValues(), ...patch });

   // Amenity names must match the ones stored in the DB, otherwise the filter never matches.
   const { data: { data: amenityOptions } = {} } = useQuery({
      queryKey: ['amenities'],
      queryFn: apiGetServices,
      staleTime: 5 * 60 * 1000,
   });

   const clearFilters = () => {
      const cleared = {
         searchPrice: undefined,
         minRating: undefined,
         bedType: undefined,
         amenities: [],
      };
      Object.entries(cleared).forEach(([name, value]) => setValue(name, value));
      onApply?.({ ...getValues(), ...cleared });
   };

   return (
      <div className="mt-5 w-full">
         <div className="flex justify-between items-center mb-1">
            <h2 className="text-base font-bold text-gray-900">Filter by</h2>
            <Button
               type="link"
               size="small"
               className="p-0 text-blue-600"
               onClick={clearFilters}
            >
               Clear all
            </Button>
         </div>

         {/* Price per night */}
         <div className="py-4 border-b border-gray-100">
            <h3 className="mb-1 text-sm font-semibold text-gray-700">
               Budget per night
            </h3>
            <div className="text-xs text-gray-500">
               {`${(watch('searchPrice')?.[0] ?? 100000).toLocaleString()} VND – ${(
                  watch('searchPrice')?.[1] ?? 5000000
               ).toLocaleString()} VND${
                  (watch('searchPrice')?.[1] ?? 5000000) === 5000000 ? '+' : ''
               }`}
            </div>
            <Controller
               name="searchPrice"
               control={control}
               render={({ field }) => (
                  <Slider
                     range={{ draggableTrack: true }}
                     min={100000}
                     max={5000000}
                     step={50000}
                     value={field.value ?? [100000, 5000000]}
                     onChange={field.onChange}
                     onChangeComplete={(value) => {
                        field.onChange(value);
                        apply({ searchPrice: value });
                     }}
                  />
               )}
            />
         </div>

         {/* Guest rating */}
         <div className="py-4 border-b border-gray-100">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
               Guest rating
            </h3>
            <Controller
               name="minRating"
               control={control}
               render={({ field }) => (
                  <div className="flex gap-2">
                     {RATING_OPTIONS.map((option) => (
                        <button
                           key={option.value}
                           type="button"
                           onClick={() => {
                              const next =
                                 field.value === option.value
                                    ? undefined
                                    : option.value;
                              field.onChange(next);
                              apply({ minRating: next });
                           }}
                           className={clsx(
                              'flex gap-1 items-center px-3.5 py-1.5 text-sm font-medium rounded-full border transition-colors cursor-pointer',
                              field.value === option.value
                                 ? 'bg-blue-500 text-white border-blue-500'
                                 : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400',
                           )}
                        >
                           <StarFilled
                              className={clsx(
                                 'text-xs',
                                 field.value === option.value
                                    ? 'text-white'
                                    : 'text-amber-400',
                              )}
                           />
                           {option.label}
                        </button>
                     ))}
                  </div>
               )}
            />
         </div>

         {/* Loai giuong */}
         <div className="py-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
               Bed type
            </h3>
            <Controller
               name="bedType"
               control={control}
               render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                     {BED_TYPES.map((bed) => (
                        <button
                           key={bed}
                           type="button"
                           onClick={() => {
                              const next = field.value === bed ? undefined : bed;
                              field.onChange(next);
                              apply({ bedType: next });
                           }}
                           className={clsx(
                              'px-3.5 py-1.5 text-sm font-medium rounded-full border transition-colors cursor-pointer',
                              field.value === bed
                                 ? 'bg-blue-500 text-white border-blue-500'
                                 : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400',
                           )}
                        >
                           {bed}
                        </button>
                     ))}
                  </div>
               )}
            />
         </div>

         {/* Tien nghi */}
         <div className="py-4 border-t border-gray-100">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
               Amenities
            </h3>
            <Controller
               name="amenities"
               control={control}
               render={({ field }) => {
                  const selected: string[] = field.value || [];
                  const toggle = (amenity: string) => {
                     const next = selected.includes(amenity)
                        ? selected.filter((item) => item !== amenity)
                        : [...selected, amenity];
                     field.onChange(next);
                     apply({ amenities: next });
                  };
                  return (
                     <div className="flex flex-wrap gap-2">
                        {(amenityOptions || []).map(
                           ({ name: amenity }: { name: string }) => (
                              <button
                                 key={amenity}
                                 type="button"
                                 onClick={() => toggle(amenity)}
                                 className={clsx(
                                    'px-3.5 py-1.5 text-sm font-medium rounded-full border transition-colors cursor-pointer',
                                    selected.includes(amenity)
                                       ? 'bg-blue-500 text-white border-blue-500'
                                       : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400',
                                 )}
                              >
                                 {amenity}
                              </button>
                           ),
                        )}
                     </div>
                  );
               }}
            />
         </div>
      </div>
   );
};

export default FilterSection;
