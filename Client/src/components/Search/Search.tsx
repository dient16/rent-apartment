import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button, Dropdown } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import {
   AutoCompleteAddress,
   CustomDatePicker,
   DropDownItem,
} from '@/components';

/**
 * Thanh search kieu Airbnb: cac section Where / When / Who tach biet,
 * hover noi bat tung section, nut search tron ben phai.
 */
const Search: React.FC = () => {
   const { handleSubmit, control, setValue } = useForm();
   const navigate = useNavigate();

   const handleSearch = (data: Record<string, any>) => {
      const queryParams = new URLSearchParams();
      if (data.searchText?.trim()) {
         queryParams.set('province', data.searchText.trim());
      }
      if (data.searchDate?.[0] && data.searchDate?.[1]) {
         queryParams.set(
            'startDate',
            moment(data.searchDate[0]).format('YYYY-MM-DD'),
         );
         queryParams.set(
            'endDate',
            moment(data.searchDate[1]).format('YYYY-MM-DD'),
         );
      }
      queryParams.set('numberOfGuest', String(data.searchGuest?.guests || 1));
      queryParams.set('roomNumber', String(data.searchGuest?.rooms || 1));
      navigate(`/listing?${queryParams.toString()}`);
   };

   const segmentClass =
      'flex flex-col justify-center px-6 py-3 rounded-full transition-colors hover:bg-gray-100 cursor-pointer min-h-[64px]';
   const labelClass =
      'text-xs font-bold tracking-wide text-gray-900 uppercase pointer-events-none';

   return (
      <form
         onSubmit={handleSubmit(handleSearch)}
         className="flex flex-col gap-1 items-stretch p-2 w-full bg-white rounded-3xl border border-gray-200 shadow-lg md:flex-row md:items-center md:rounded-full md:gap-0 font-main max-w-[960px]"
      >
         {/* ===== Where ===== */}
         <Controller
            control={control}
            name="searchText"
            defaultValue=""
            render={({ field }) => (
               <label className={`${segmentClass} relative flex-[1.2] min-w-0`}>
                  <span className={labelClass}>Where</span>
                  <input
                     placeholder="Search destinations"
                     className="w-full text-sm text-gray-800 placeholder-gray-400 bg-transparent border-none outline-none"
                     value={field.value}
                     onChange={(event) => field.onChange(event.target.value)}
                  />
                  <AutoCompleteAddress
                     value={field.value}
                     onChange={field.onChange}
                     setValue={setValue}
                  />
               </label>
            )}
         />

         <span className="hidden self-center w-px h-9 bg-gray-200 md:block" />

         {/* ===== When ===== */}
         <Controller
            name="searchDate"
            control={control}
            defaultValue={[moment().toDate(), moment().add(1, 'days').toDate()]}
            render={({ field }) => (
               <div className={`${segmentClass} relative flex-[1.3]`}>
                  <span className={labelClass}>When</span>
                  <CustomDatePicker
                     value={field.value}
                     onChange={(dates) => field.onChange(dates)}
                     className="text-sm hit-area-full"
                     format="DD MMM"
                     variant="compact"
                     isBorder={false}
                     minDate={new Date()}
                  />
               </div>
            )}
         />

         <span className="hidden self-center w-px h-9 bg-gray-200 md:block" />

         {/* ===== Who ===== */}
         <Controller
            name="searchGuest"
            control={control}
            defaultValue={{ guests: 1, rooms: 1 }}
            render={({ field }) => (
               <Dropdown
                  dropdownRender={() => (
                     <DropDownItem
                        value={field.value}
                        onChange={(value) => field.onChange(value)}
                     />
                  )}
                  placement="bottomLeft"
                  trigger={['click']}
               >
                  <div className={`${segmentClass} flex-1`}>
                     <span className={labelClass}>Who</span>
                     <span className="text-sm text-gray-800 whitespace-nowrap">
                        {field.value?.guests || 1} guest
                        {(field.value?.guests || 1) > 1 ? 's' : ''} ·{' '}
                        {field.value?.rooms || 1} room
                        {(field.value?.rooms || 1) > 1 ? 's' : ''}
                     </span>
                  </div>
               </Dropdown>
            )}
         />

         {/* ===== Nut search ===== */}
         <div className="flex justify-center items-center pr-1 pl-2">
            <Button
               type="primary"
               htmlType="submit"
               className="flex gap-2 justify-center items-center w-full h-12 text-base font-semibold bg-blue-500 rounded-full border-none md:w-auto md:px-6 hover:bg-blue-600"
               icon={<SearchOutlined className="text-lg" />}
            >
               Search
            </Button>
         </div>
      </form>
   );
};

export default Search;
