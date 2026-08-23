import React, { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Dropdown, Tooltip } from 'antd';
import { FaMapMarkerAlt } from 'react-icons/fa';
import { AutoCompleteAddress, CustomDatePicker, DropDownItem } from '@/components';
import moment from 'moment';
import icons from '@/utils/icons';

const { PiUserThin } = icons;

interface SearchSectionProps {
   searchParams: URLSearchParams;
}

const plural = (count: number, noun: string) =>
   `${count} ${noun}${count === 1 ? '' : 's'}`;

/** One boxed row — keeps the three fields visually identical. */
const fieldBox =
   'flex items-center gap-2.5 w-full min-h-[52px] px-3.5 bg-white border-[1.5px] border-gray-300 rounded-xl transition-colors hover:border-gray-500 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100';

const SearchSection: React.FC<SearchSectionProps> = ({ searchParams }) => {
   const { control, setValue } = useFormContext();
   // The field is prefilled from the URL, so the suggestion list must stay shut
   // until the user actually focuses or types in it.
   const [suggestOpen, setSuggestOpen] = useState(false);

   // These are the names the search form actually writes to the URL — the old
   // `numberOfGuests` / `numberOfRooms` never matched, so the panel always showed 1.
   const numberOfGuests: number = Number(searchParams.get('numberOfGuest')) || 1;
   const numberOfRooms: number = Number(searchParams.get('roomNumber')) || 1;
   const startDate: string | null = searchParams.get('startDate');
   const endDate: string | null = searchParams.get('endDate');

   const [state, setState] = useState({
      startDate: startDate ? moment(startDate).toDate() : new Date(),
      endDate: endDate
         ? moment(endDate).toDate()
         : moment().add(7, 'days').toDate(),
   });

   const handleDateChange = (dates: [Date, Date]) => {
      setState({ startDate: dates[0], endDate: dates[1] });
   };

   return (
      <div className="w-full">
         <div className="flex flex-col gap-2.5">
            <div className="px-1 text-base font-semibold text-gray-900">
               Search
            </div>

            {/* ===== Destination ===== */}
            <Controller
               name="searchText"
               control={control}
               defaultValue={searchParams.get('province') ?? ''}
               render={({ field, fieldState: { error } }) => (
                  <Tooltip
                     title={error?.message}
                     color="red"
                     open={!!error}
                     placement="right"
                     zIndex={5}
                  >
                     <div className="relative">
                        <div
                           className={
                              error
                                 ? `${fieldBox} border-red-400! focus-within:border-red-400!`
                                 : fieldBox
                           }
                        >
                           <FaMapMarkerAlt className="flex-shrink-0 text-gray-400" />
                           <input
                              placeholder="Anywhere — city, district..."
                              className="flex-1 min-w-0 text-sm text-gray-800 placeholder-gray-400 bg-transparent border-none outline-none"
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

            {/* ===== Dates ===== */}
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
                     <div className={fieldBox}>
                        {/* flex-1 so the picker's own wrapper stretches — otherwise it
                            shrinks to its text and the chevron cannot dock right. */}
                        <div className="flex-1 min-w-0">
                           <CustomDatePicker
                              value={[state.startDate, state.endDate]}
                              onChange={(dates) => {
                                 handleDateChange(dates);
                                 field.onChange(dates);
                              }}
                              isBorder={false}
                              className="my-0! h-full! w-full text-sm"
                           />
                        </div>
                     </div>
                  </Tooltip>
               )}
            />

            {/* ===== Guests ===== */}
            <Controller
               name="searchGuest"
               control={control}
               rules={{ required: 'Number of guests is required' }}
               defaultValue={{ guests: numberOfGuests, rooms: numberOfRooms }}
               render={({ field, fieldState: { error } }) => (
                  <Tooltip
                     title={error?.message}
                     color="red"
                     open={!!error}
                     placement="left"
                     zIndex={5}
                  >
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
                           className={`${fieldBox} cursor-pointer text-left`}
                        >
                           <PiUserThin size={20} className="flex-shrink-0 text-gray-400" />
                           {/* Read from `field.value` so the label updates immediately —
                               getValues() does not re-render on change. */}
                           <span className="flex-1 text-sm text-gray-800 truncate">
                              {plural(field.value?.guests ?? 1, 'adult')} ·{' '}
                              {plural(field.value?.rooms ?? 1, 'room')}
                           </span>
                        </button>
                     </Dropdown>
                  </Tooltip>
               )}
            />
         </div>
      </div>
   );
};

export default SearchSection;
