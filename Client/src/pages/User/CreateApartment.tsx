import { FormAddRoom, InputForm, SelectForm } from '@/components';
import { Flex, Button, message, Spin } from 'antd';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiCreateApartment } from '@/apis';
import type { UploadFile } from 'antd/es/upload/interface';
import { Provinces } from '@/utils/location/provinces';
import { Districts } from '@/utils/location/districts';
import { Wards } from '@/utils/location/wards';

const CreateApartment: React.FC = () => {
   const createApartmentMutation = useMutation({
      mutationFn: apiCreateApartment,
   });
   const [districtsOption, setDistrictsOption] = useState([]);
   const [rooms, setRooms] = useState([{}]);
   const queryClient = useQueryClient();
   const [wardsOption, setWardsOption] = useState([]);
   const {
      handleSubmit,
      control,
      reset,
      formState: { errors },
      setValue,
   } = useForm<ApartmentType>();
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

   const handleRemoveRoom = (indexToRemove: number) => {
      setRooms((prevRooms) => {
         const updatedRooms = [
            ...prevRooms.slice(0, indexToRemove),
            ...prevRooms.slice(indexToRemove + 1),
         ];
         return updatedRooms;
      });
   };

   const handleCreateApartment = async (data: ApartmentType) => {
      data.location.province = Provinces.find(
         (province) => String(province.code) === String(data.location.province),
      )?.name;
      data.location.district = districtsOption.find(
         (district) => String(district.code) === String(data.location.district),
      )?.name;
      data.rooms = data.rooms.filter(
         (room: Room) => room?.images !== undefined,
      );
      const formData = new FormData();
      data.rooms.forEach((room: Room, index: number) => {
         Object.entries(room).forEach(([key]) => {
            if (key === 'images') {
               room.images.forEach((image: UploadFile) => {
                  formData.append(
                     `rooms[${index}][images]`,
                     image.originFileObj,
                  );
               });
               delete data.rooms[index].images;
            }
         });
      });

      Object.entries(data).forEach(([key, value]) => {
         value = JSON.stringify(value);
         formData.append(key, value as string);
      });
      createApartmentMutation.mutate(formData, {
         onSuccess: (response: Res) => {
            if (response.success) {
               message.success('Create apartment successfully');
               queryClient.invalidateQueries({
                  queryKey: ['apartmentUser'],
               });
               // reset();
            }
         },
         onError: () => {
            message.error('Create apartment failed');
         },
      });
   };

   return createApartmentMutation.isPending ? (
      <div className="min-h-screen">
         <Spin
            size="large"
            spinning={true}
            fullscreen={createApartmentMutation.isPending}
         />
      </div>
   ) : (
      <form onSubmit={handleSubmit(handleCreateApartment)}>
         <div className="flex flex-col gap-3 mx-auto mb-10 max-w-main">
            <h1 className="mb-5 text-3xl font-bold">Create Apartment</h1>
            <InputForm
               control={control}
               name="title"
               rules={{ required: 'Name is required' }}
               placeholder="Enter the name"
               label="Name"
            />

            <div className="flex flex-col flex-wrap gap-5 items-center sm:flex-row lg:flex-nowrap">
               <SelectForm
                  control={control}
                  name="location.province"
                  rules={{ required: 'Province is required' }}
                  placeholder="Enter the province"
                  label="Province"
                  options={(Provinces || []).map((province) => {
                     return {
                        label: province.name,
                        value: province.code,
                     };
                  })}
                  onChangeSelected={handleProvinceChange}
                  className="w-full min-w-[250px]"
               />
               <SelectForm
                  control={control}
                  name="location.district"
                  rules={{ required: 'District is required' }}
                  placeholder="Enter the district"
                  label="District"
                  options={(districtsOption || []).map((district) => {
                     return {
                        label: district.name,
                        value: district.code,
                     };
                  })}
                  onChangeSelected={handleDistrictChange}
                  className="w-full min-w-[250px]"
               />
               <SelectForm
                  control={control}
                  name="location.ward"
                  rules={{ required: 'Ward is required' }}
                  placeholder="Enter the ward"
                  label="Ward"
                  options={(wardsOption || []).map((ward) => {
                     return {
                        label: ward.name,
                        value: ward.name,
                     };
                  })}
                  className="w-full min-w-[250px]"
               />
            </div>
            <div>
               <InputForm
                  control={control}
                  name="location.street"
                  rules={{ required: 'Street is required' }}
                  placeholder="Enter the street"
                  label="Street"
               />
            </div>

            <Flex gap={20} align="center" className="flex-wrap sm:flex-nowrap">
               <InputForm
                  control={control}
                  name="location.longitude"
                  rules={{ required: 'Longitude is required' }}
                  placeholder="Enter the longitude"
                  label="Longitude"
                  type="number"
                  className="min-w-[250px]"
               />
               <InputForm
                  control={control}
                  name="location.latitude"
                  rules={{ required: 'Latitude is required' }}
                  placeholder="Enter the latitude"
                  label="Latitude"
                  type="number"
                  className="min-w-[250px]"
               />
            </Flex>

            <h2 className="text-xl font-medium">Room information</h2>
            {rooms.map((room, index) => (
               <FormAddRoom
                  key={index}
                  control={control}
                  errors={errors}
                  indexRoom={index}
                  onClose={handleRemoveRoom}
               />
            ))}
            <Button onClick={() => setRooms([...rooms, {}])}>
               Add more room
            </Button>
            <Button
               htmlType="submit"
               type="primary"
               size="large"
               className="text-white bg-blue-600 hover:bg-blue-700"
            >
               Create apartment
            </Button>
         </div>
      </form>
   );
};

export default CreateApartment;
