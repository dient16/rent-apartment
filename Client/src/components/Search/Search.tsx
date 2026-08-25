import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button, Drawer, Dropdown, Tooltip } from 'antd';
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from '@/lib/router-compat';
import moment from 'moment';
import {
   AutoCompleteAddress,
   CustomDatePicker,
   DropDownItem,
} from '@/components';

/**
 * Airbnb-style search bar: separate Where / When / Who sections,
 * hover highlights one section, round search button on the right.
 */
const Search: React.FC = () => {
   const { handleSubmit, control, setValue } = useForm();
   const navigate = useNavigate();
   // Mobile/tablet: the Where field opens a full-screen sheet instead of an inline popup
   const [whereOpen, setWhereOpen] = useState(false);
   const [whoOpen, setWhoOpen] = useState(false);
   const [activePanel, setActivePanel] = useState<'where' | 'when' | 'who' | null>(
      null,
   );
   const isCompactScreen = () =>
      typeof window !== 'undefined' && window.innerWidth < 1024;

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
      'flex flex-col justify-center gap-0.5 px-4 py-2.5 rounded-2xl transition-colors hover:bg-gray-100 cursor-pointer min-h-[56px] md:px-5 md:rounded-full md:min-h-[58px]';
   const labelClass =
      'text-xs font-bold tracking-wide text-gray-900 uppercase pointer-events-none leading-none';

   return (
      <form
         onSubmit={handleSubmit(handleSearch)}
         // Mobile: one grey segment per row + full-width button. md+: single pill row.
         className="flex flex-col gap-1.5 items-stretch p-2 w-full bg-white rounded-3xl border border-gray-200 shadow-lg md:flex-row md:items-center md:rounded-full md:gap-0 font-main max-w-[960px]"
      >
         {/* ===== Where ===== */}
         <Controller
            control={control}
            name="searchText"
            defaultValue=""
            rules={{
               validate: (value) =>
                  value?.trim() ? true : 'Please enter a destination',
            }}
            render={({ field, fieldState: { error } }) => (
               <>
                  <Tooltip
                     title={error?.message}
                     color="red"
                     open={!!error}
                     placement="bottom"
                  >
                  <label
                     className={`${segmentClass} relative flex-[1.15] min-w-0 bg-gray-50 md:bg-transparent ${
                        error ? 'ring-1 ring-red-400 bg-red-50/40 rounded-full' : ''
                     }`}
                  >
                     <span className={labelClass}>Where</span>
                     <input
                        placeholder="Search destinations"
                        className="w-full text-[15px] text-gray-800 placeholder-gray-400 bg-transparent border-none outline-none"
                        value={field.value}
                        onChange={(event) => {
                           setActivePanel('where');
                           field.onChange(event.target.value);
                        }}
                        onFocus={(event) => {
                           if (isCompactScreen()) {
                              event.target.blur();
                              setWhereOpen(true);
                              return;
                           }
                           setActivePanel('where');
                        }}
                        // Clicking away should dismiss the list; the options call
                        // preventDefault on mousedown so selecting one still works.
                        onBlur={() =>
                           setActivePanel((panel) =>
                              panel === 'where' ? null : panel,
                           )
                        }
                     />
                     <span className="hidden lg:block">
                        <AutoCompleteAddress
                           open={activePanel === 'where'}
                           value={field.value}
                           onChange={field.onChange}
                           setValue={setValue}
                           onSelect={() => setActivePanel(null)}
                        />
                     </span>
                  </label>
                  </Tooltip>

                  {/* Mobile/tablet full-screen destination sheet */}
                  <Drawer
                     open={whereOpen}
                     onClose={() => setWhereOpen(false)}
                     placement="bottom"
                     size="100%"
                     closable={false}
                     zIndex={1000}
                     styles={{ body: { padding: 0 } }}
                  >
                     <div className="flex flex-col h-full font-main">
                        <div className="flex gap-3 items-center px-4 py-3 border-b border-gray-100">
                           <button
                              type="button"
                              onClick={() => setWhereOpen(false)}
                              className="flex justify-center items-center w-9 h-9 text-gray-700 bg-gray-100 rounded-full border-none cursor-pointer"
                           >
                              <ArrowLeftOutlined />
                           </button>
                           <span className="text-base font-semibold text-gray-900">
                              Where to?
                           </span>
                        </div>
                        <div className="p-4">
                           <div className="flex gap-2 items-center px-4 h-12 bg-gray-100 rounded-2xl">
                              <SearchOutlined className="text-gray-400" />
                              <input
                                 autoFocus
                                 placeholder="Search destinations"
                                 className="flex-1 text-[15px] text-gray-800 placeholder-gray-400 bg-transparent border-none outline-none"
                                 value={field.value}
                                 onChange={(event) => field.onChange(event.target.value)}
                              />
                           </div>
                        </div>
                        <div className="overflow-y-auto flex-1 px-2">
                           <AutoCompleteAddress
                              inline
                              value={field.value}
                              onChange={field.onChange}
                              setValue={setValue}
                              onSelect={() => setWhereOpen(false)}
                           />
                        </div>
                        <div className="p-4 border-t border-gray-100">
                           <Button
                              type="primary"
                              size="large"
                              className="w-full h-12 font-semibold bg-blue-500 rounded-2xl"
                              onClick={() => setWhereOpen(false)}
                           >
                              Done
                           </Button>
                        </div>
                     </div>
                  </Drawer>
               </>
            )}
         />

         <span className="hidden self-center w-px h-8 bg-gray-200 md:block" />

         {/* ===== When ===== */}
         <Controller
            name="searchDate"
            control={control}
            defaultValue={[moment().toDate(), moment().add(1, 'days').toDate()]}
            render={({ field }) => (
               <div className={`${segmentClass} relative flex-[1.1] min-w-0 bg-gray-50 md:bg-transparent`}>
                  <span className={labelClass}>When</span>
                  <CustomDatePicker
                     value={field.value}
                     onChange={(dates) => field.onChange(dates)}
                     className="text-[15px] hit-area-full"
                     format="DD MMM"
                     variant="compact"
                     isBorder={false}
                     minDate={new Date()}
                     open={activePanel === 'when'}
                     onOpenChange={(next) => setActivePanel(next ? 'when' : null)}
                  />
               </div>
            )}
         />

         <span className="hidden self-center w-px h-8 bg-gray-200 md:block" />

         {/* ===== Who ===== */}
         <Controller
            name="searchGuest"
            control={control}
            defaultValue={{ guests: 1, rooms: 1 }}
            render={({ field }) => {
               const summary = (
                  <>
                     <span className={labelClass}>Who</span>
                     <span className="text-[15px] text-gray-800 truncate">
                        {field.value?.guests || 1} guest
                        {(field.value?.guests || 1) > 1 ? 's' : ''} ·{' '}
                        {field.value?.rooms || 1} room
                        {(field.value?.rooms || 1) > 1 ? 's' : ''}
                     </span>
                  </>
               );
               return (
                  <>
                     {/* Desktop: inline dropdown */}
                     <div className="hidden lg:block flex-1">
                        <Dropdown
                           popupRender={() => (
                              <DropDownItem
                                 value={field.value}
                                 onChange={(value) => field.onChange(value)}
                              />
                           )}
                           placement="bottomLeft"
                           trigger={['click']}
                           open={activePanel === 'who'}
                           onOpenChange={(next) =>
                              setActivePanel(next ? 'who' : null)
                           }
                        >
                           <div className={segmentClass}>{summary}</div>
                        </Dropdown>
                     </div>

                     {/* Mobile/tablet: full-screen sheet */}
                     <div
                        className={`${segmentClass} flex-1 min-w-0 bg-gray-50 md:bg-transparent lg:hidden`}
                        onClick={() => setWhoOpen(true)}
                     >
                        {summary}
                     </div>
                     <Drawer
                        open={whoOpen}
                        onClose={() => setWhoOpen(false)}
                        placement="bottom"
                        size="100%"
                        closable={false}
                        zIndex={1000}
                        styles={{ body: { padding: 0 } }}
                     >
                        <div className="flex flex-col h-full font-main">
                           <div className="flex gap-3 items-center px-4 py-3 border-b border-gray-100">
                              <button
                                 type="button"
                                 onClick={() => setWhoOpen(false)}
                                 className="flex justify-center items-center w-9 h-9 text-gray-700 bg-gray-100 rounded-full border-none cursor-pointer"
                              >
                                 <ArrowLeftOutlined />
                              </button>
                              <span className="text-base font-semibold text-gray-900">
                                 Who&apos;s coming?
                              </span>
                           </div>
                           <div className="flex-1 px-5 py-2">
                              <DropDownItem
                                 value={field.value}
                                 onChange={(value) => field.onChange(value)}
                              />
                           </div>
                           <div className="p-4 border-t border-gray-100">
                              <Button
                                 type="primary"
                                 size="large"
                                 className="w-full h-12 font-semibold bg-blue-500 rounded-2xl"
                                 onClick={() => setWhoOpen(false)}
                              >
                                 Done
                              </Button>
                           </div>
                        </div>
                     </Drawer>
                  </>
               );
            }}
         />

         {/* ===== Search button ===== */}
         <div className="flex justify-center items-center mt-0.5 md:mt-0 md:pr-1 md:pl-2">
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
