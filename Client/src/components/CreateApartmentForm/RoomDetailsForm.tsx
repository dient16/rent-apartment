import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { InputField, RoomAmenitySelector, SelectField } from '@/components';
import { apiGetServices } from '@/apis';

interface RoomDetailsFormProps {
   index: number;
}
const bedOptions = [
   'Single',
   'Double',
   'Twin',
   'Queen',
   'King',
   'One Single Bed',
   'One Double Bed',
   'One Queen Bed',
   'One King Bed',
   'One Double Bed and One Single Bed',
   'One Double Bed and Two Single Bed',
   'One Double Bed and Four Single Bed',
   'One Double Bed or Two Single Bed',
   'Two Single Bed',
   'Two Double Bed',
   'Two Queen Bed',
   'Two King Bed',
   'Two Double Bed and Two Single Bed',
   'Two Double Bed and One Single Bed',
   'One King Bed and One Sofa Bed',
   'One King Bed and Two Single Bed',
   'Three Single Bed',
   'Three Double Bed',
   'Double Single Bed and Sofa Bed',
   'Capsule Bed',
   'Bunk Bed',
];

const RoomDetailsForm: React.FC<RoomDetailsFormProps> = ({ index }) => {
   const { control } = useFormContext();

   const { data: { data: amenities } = {} } = useQuery({
      queryKey: ['amenities'],
      queryFn: apiGetServices,
   });

   return (
      <div className="mb-6">
         <div className="mb-6">
            <InputField
               name={`rooms.${index}.roomType`}
               label="Room Type"
               rules={{ required: 'Room type is required' }}
            />
         </div>
         <div className="grid grid-cols-3 gap-3 mb-3">
            <InputField
               name={`rooms.${index}.size`}
               label="Size"
               type="number"
               rules={{ required: 'Size is required' }}
               suffix="m²"
            />
            <InputField
               name={`rooms.${index}.price`}
               label="Price"
               type="number"
               rules={{ required: 'Price is required', min: 0 }}
               formatter={(value) => {
                  if (!value) return '';
                  return `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
               }}
               parser={(value) => {
                  // Strip every separator, not just commas: Vietnamese keyboards type
                  // "299.824", which used to survive as the float 299.824.
                  if (!value) return '';
                  return value.replace(/[^\d]/g, '');
               }}
               suffix="VND"
            />
            <SelectField
               name={`rooms.${index}.bedType`}
               label="Bed Type"
               options={bedOptions.map((bedType) => {
                  return {
                     label: bedType,
                     value: bedType,
                  };
               })}
               rules={{ required: 'Bed Type is required' }}
            />
         </div>
         <div className="grid grid-cols-2 gap-3 mb-3">
            <InputField
               name={`rooms.${index}.numberOfGuest`}
               label="Maximum Number of Guests"
               type="number"
               rules={{
                  required: 'Number of guests is required',
                  min: {
                     value: 0,
                     message: 'Number of guests cannot be less than 0',
                  },
                  validate: (value) =>
                     Number.isInteger(Number(value)) ||
                     'Number of guests must be an integer',
               }}
               suffix="persons"
            />
            <InputField
               name={`rooms.${index}.quantity`}
               label="Number of Rooms for This Type"
               type="number"
               suffix="rooms"
               rules={{
                  required: 'Quantity is required',
                  min: 0,
                  validate: (value) =>
                     Number.isInteger(Number(value)) ||
                     'Quantity must be an integer',
               }}
            />
         </div>
         <div>
            <Controller
               name={`rooms.${index}.amenities`}
               control={control}
               defaultValue={[]}
               rules={{ required: 'Amenities are required' }}
               render={({ field, fieldState: { error } }) => (
                  <div>
                     <RoomAmenitySelector
                        options={(amenities || []).map((item) => ({
                           label: item.name,
                           value: item._id,
                           imageSrc: item.icon,
                        }))}
                        selectedValues={field.value}
                        onChange={field.onChange}
                     />
                     {error && (
                        <span className="text-red-500 mt-2">
                           {error.message}
                        </span>
                     )}
                  </div>
               )}
            />
         </div>
      </div>
   );
};

export default RoomDetailsForm;
