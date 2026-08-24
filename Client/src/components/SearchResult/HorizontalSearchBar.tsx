import React, { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Button, Dropdown, Tooltip } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { FaMapMarkerAlt } from 'react-icons/fa';
import moment from 'moment';
import { AutoCompleteAddress, CustomDatePicker, DropDownItem } from '@/components';
import icons from '@/utils/icons';

const { PiUserThin } = icons;

interface HorizontalSearchBarProps {
   searchParams: URLSearchParams;
}

const plural = (count: number, noun: string) =>
   `${count} ${noun}${count === 1 ? '' : 's'}`;

/** One-line search bar shown above the results on desktop. */
const HorizontalSearchBar: React.FC<HorizontalSearchBarProps> = ({
   searchParams,
}) => {
   const { control, setValue } = useFormContext();
   const [suggestOpen, setSuggestOpen] = useState(false);

   const numberOfGuests: number = Number(searchParams.get('numberOfGuest')) || 1;
   const numberOfRooms: number = Number(searchParams.get('roomNumber')) || 1;
   const startDate: string | null = searchParams.get('startDate');
   const endDate: string | null = searchParams.get('endDate');

   const [dates, setDates] = useState<[Date, Date]>([
      startDate ? moment(startDate).toDate() : new Date(),
      endDate ? moment(endDate).toDate() : moment().add(7, 'days').toDate(),
   ]);

   const segment =
      'flex items-center gap-2.5 h-[46px] px-4 min-w-0 rounded-xl transition-colors hover:bg-gray-50 focus-within:bg-gray-50';

   return (
      <div className="flex gap-1 items-center p-2 w-full bg-white rounded-2xl border border-gray-100 shadow-card-sm">
         {/* ===== Destination ===== */}
         <Controller
            name="searchText"
            control={control}
            defaultValue={searchParams.get('province') ?? ''}
            rules={{
               validate: (value) =>
                  value?.trim() ? true : 'Please enter a destination',
            }}
            render={({ field, fieldState: { error } }) => (
               <Tooltip title={error?.message} color="red" open={!!error} placement="bottom">
                  <div className="relative flex-[1.2] min-w-0">
                     <div
                        className={`${segment} ${error ? 'ring-1 ring-red-400 bg-red-50/40' : ''}`}
                     >
                        <FaMapMarkerAlt className="flex-shrink-0 text-blue-500" />
                        <input
                           placeholder="Anywhere — city, district..."
                           className="flex-1 min-w-0 text-sm font-medium text-gray-800 placeholder-gray-400 bg-transparent border-none outline-none"
                           value={field.value ?? ''}
                           onFocus={() => setSuggestOpen(true)}
                           onBlur={() => setSuggestOpen(false)}
                           onChange={(event) => {
                              setSuggestOpen(true);
                              field.onChange(event.target.value);
                           }}
                        />
                     </div>
                     <AutoCompleteAddress
                        matchWidth
                        open={suggestOpen}
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        setValue={setValue}
                        onSelect={() => setSuggestOpen(false)}
                     />
                  </div>
               </Tooltip>
            )}
         />

         <span className="w-px h-7 bg-gray-200 flex-shrink-0" />

         {/* ===== Dates ===== */}
         <Controller
            name="searchDate"
            control={control}
            defaultValue={dates}
            render={({ field, fieldState: { error } }) => (
               <Tooltip title={error?.message} color="red" open={!!error} placement="bottom">
                  <div className={`${segment} flex-[1.3]`}>
                     <div className="flex-1 min-w-0">
                        <CustomDatePicker
                           value={dates}
                           onChange={(value) => {
                              setDates(value);
                              field.onChange(value);
                           }}
                           isBorder={false}
                           className="my-0! h-full! w-full text-sm"
                        />
                     </div>
                  </div>
               </Tooltip>
            )}
         />

         <span className="w-px h-7 bg-gray-200 flex-shrink-0" />

         {/* ===== Guests ===== */}
         <Controller
            name="searchGuest"
            control={control}
            defaultValue={{ guests: numberOfGuests, rooms: numberOfRooms }}
            render={({ field, fieldState: { error } }) => (
               <Tooltip title={error?.message} color="red" open={!!error} placement="bottom">
                  <Dropdown
                     popupRender={() => (
                        <DropDownItem
                           value={field.value}
                           onChange={(value) => field.onChange(value)}
                        />
                     )}
                     placement="bottomLeft"
                     trigger={['click']}
                     getPopupContainer={(trigger) => trigger.parentElement!}
                  >
                     <button
                        type="button"
                        className={`${segment} flex-1 text-left bg-transparent border-none cursor-pointer`}
                     >
                        <PiUserThin size={20} className="flex-shrink-0 text-blue-500" />
                        <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                           {plural(field.value?.guests ?? 1, 'adult')} ·{' '}
                           {plural(field.value?.rooms ?? 1, 'room')}
                        </span>
                     </button>
                  </Dropdown>
               </Tooltip>
            )}
         />

         <Button
            type="primary"
            htmlType="submit"
            icon={<SearchOutlined />}
            className="flex-shrink-0 px-6 h-[46px] font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl border-none shadow-md shadow-blue-500/20 font-main hover:from-blue-700 hover:to-blue-600"
         >
            Search
         </Button>
      </div>
   );
};

export default HorizontalSearchBar;
