import React, { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Input, Tooltip, Dropdown, Button } from 'antd';
import { FaMapMarkerAlt } from 'react-icons/fa';
import { CustomDatePicker, DropDownItem } from '@/components';
import moment from 'moment';
import icons from '@/utils/icons';

const { PiUserThin } = icons;

interface SearchSectionProps {
   searchParams: URLSearchParams;
}

const SearchSection: React.FC<SearchSectionProps> = ({ searchParams }) => {
   const { control, getValues } = useFormContext();

   // "|| 1" also covers NaN/0 from a missing or malformed query param
   const numberOfGuests: number = Number(searchParams.get('numberOfGuests')) || 1;
   const numberOfRooms: number = Number(searchParams.get('numberOfRooms')) || 1;
   const startDate: string | null = searchParams.get('startDate');
   const endDate: string | null = searchParams.get('endDate');

   const [state, setState] = useState({
      startDate: startDate ? moment(startDate).toDate() : new Date(),
      endDate: endDate
         ? moment(endDate).toDate()
         : moment().add(7, 'days').toDate(),
   });

   const handleDateChange = (dates: [Date, Date]) => {
      setState({
         startDate: dates[0],
         endDate: dates[1],
      });
   };

   return (
      <div className="w-full rounded-lg">
         <div className="flex flex-col gap-2">
            <div className="mx-2 text-lg">Search</div>
            <Controller
               name="searchText"
               control={control}
               defaultValue={searchParams.get('province')}
               render={({ field, fieldState: { error } }) => (
                  <Tooltip
                     title={error?.message}
                     color="red"
                     open={!!error}
                     placement="right"
                     zIndex={5}
                  >
                     <Input
                        size="large"
                        placeholder="Anywhere — city, district..."
                        className="py-3 pl-10 pr-5 w-full rounded-xl border"
                        status={error ? 'error' : ''}
                        prefix={
                           <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        }
                        {...field}
                     />
                  </Tooltip>
               )}
            />
            <Controller
               name="searchDate"
               control={control}
               rules={{ required: 'Please select the time' }}
               defaultValue={[state.startDate, state.endDate]}
               render={({ field, fieldState: { error } }) => (
                  <Tooltip
                     title={error?.message}
                     color="red"
                     open={!!error}
                     placement="right"
                     zIndex={5}
                  >
                     <CustomDatePicker
                        value={[state.startDate, state.endDate]}
                        onChange={(dates) => {
                           handleDateChange(dates);
                           field.onChange(dates);
                        }}
                        className="mt-2"
                     />
                  </Tooltip>
               )}
            />
            <Controller
               name="searchGuest"
               control={control}
               rules={{ required: 'Number of guests is required' }}
               defaultValue={{ guests: +numberOfGuests, rooms: +numberOfRooms }}
               render={({ field, fieldState: { error } }) => (
                  <Tooltip
                     title={error?.message}
                     color="red"
                     open={!!error}
                     placement="left"
                     zIndex={5}
                  >
                     <Dropdown
                        dropdownRender={() => (
                           <DropDownItem
                              value={field.value}
                              onChange={(value) => field.onChange(value)}
                           />
                        )}
                        placement="bottomLeft"
                        trigger={['click']}
                        getPopupContainer={(trigger) => trigger.parentElement!}
                     >
                        <Button className="mb-4 flex gap-1 justify-center items-center w-full bg-white rounded-xl font-main h-[48px]">
                           <PiUserThin size={25} />
                           <span className="">{`${
                              getValues('searchGuest')?.guests ?? 1
                           } adult · ${
                              getValues('searchGuest')?.rooms ?? 1
                           } rooms`}</span>
                        </Button>
                     </Dropdown>
                  </Tooltip>
               )}
            />
         </div>
      </div>
   );
};

export default SearchSection;
