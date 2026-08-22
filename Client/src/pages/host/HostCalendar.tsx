import React, { useMemo, useState } from 'react';
import {
   Button,
   InputNumber,
   message,
   Popover,
   Skeleton,
   Spin,
   Tooltip,
} from 'antd';
import {
   CalendarOutlined,
   DollarOutlined,
   DownOutlined,
   LeftOutlined,
   RightOutlined,
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import clsx from 'clsx';
import {
   useMutation,
   useQueries,
   useQuery,
   useQueryClient,
} from '@tanstack/react-query';
import {
   apiGetApartmentByUser,
   apiGetRoomByApartmentId,
   apiGetPricingByRoomId,
   apiUpdatePricing,
} from '@/apis';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_MINI = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = Array.from({ length: 12 }, (_, index) =>
   dayjs().month(index).format('MMM'),
);

interface RoomItem {
   _id: string;
   roomType: string;
   images?: string[];
}

/** Xay 42 o (6 tuan) cho mot thang */
const buildDays = (month: Dayjs): Dayjs[] => {
   const start = month.startOf('month').startOf('week');
   return Array.from({ length: 42 }, (_, index) => start.add(index, 'day'));
};

const HostCalendar: React.FC = () => {
   const queryClient = useQueryClient();
   const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
   const [currentMonth, setCurrentMonth] = useState<Dayjs>(() =>
      dayjs().startOf('month'),
   );
   const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
   const [pickerOpen, setPickerOpen] = useState(false);
   const [pickerYear, setPickerYear] = useState(() => dayjs().year());
   const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
   const [draftPrice, setDraftPrice] = useState<number | null>(null);

   const { data: apartments, isLoading: isLoadingApartments } = useQuery({
      queryKey: ['apartments-host'],
      queryFn: apiGetApartmentByUser,
   });

   const apartmentList = useMemo(
      () => apartments?.data || [],
      [apartments],
   );

   // Tai phong cua TAT CA apartment de dung rail thumbnail ben trai
   const roomQueries = useQueries({
      queries: apartmentList.map((apartment) => ({
         queryKey: ['rooms', apartment._id],
         queryFn: () => apiGetRoomByApartmentId(apartment._id),
         staleTime: 5 * 60 * 1000,
      })),
   });

   /** [{apartment, rooms}] cho rail trai */
   const groups = useMemo(
      () =>
         apartmentList.map((apartment, index) => ({
            apartment,
            rooms: ((roomQueries[index]?.data as Res | undefined)?.data
               ?.rooms || []) as RoomItem[],
         })),
      [apartmentList, roomQueries],
   );

   const isLoadingRooms = roomQueries.some((query) => query.isLoading);

   const activeGroup = groups.find((group) =>
      group.rooms.some((room) => room._id === selectedRoom),
   );
   const activeRoom = activeGroup?.rooms.find(
      (room) => room._id === selectedRoom,
   );

   // Tu chon phong dau tien khi du lieu san sang
   React.useEffect(() => {
      if (!selectedRoom) {
         const first = groups.find((group) => group.rooms.length > 0)
            ?.rooms[0]?._id;
         if (first) setSelectedRoom(first);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [groups]);

   const { data: pricingData, isLoading: isLoadingPricing } = useQuery({
      queryKey: ['pricing', selectedRoom],
      queryFn: () => apiGetPricingByRoomId(selectedRoom),
      enabled: !!selectedRoom,
   });

   const updatePricingMutation = useMutation({
      mutationFn: ({ date, price }: { date: string; price: number }) =>
         apiUpdatePricing(selectedRoom!, date, price),
      onSuccess: (response: Res) => {
         if (response.success) {
            message.success('Nightly price updated');
            queryClient.invalidateQueries({
               queryKey: ['pricing', selectedRoom],
            });
            setSelectedDate(null);
         } else {
            message.error(response.message);
         }
      },
      onError: () => message.error('Error updating pricing'),
   });

   const defaultPrice: number | undefined = pricingData?.data?.defaultPrice;

   const priceMap = useMemo(() => {
      const map: Record<string, number> = {};
      (pricingData?.data?.pricings || []).forEach(
         (pricing: { date: string; price: number }) => {
            map[dayjs(pricing.date).format('YYYY-MM-DD')] = pricing.price;
         },
      );
      return map;
   }, [pricingData]);

   const today = dayjs().startOf('day');
   // Month view: cuon doc lien tuc qua 12 thang ke tu thang dang chon
   const monthsWindow = useMemo(
      () =>
         Array.from({ length: 12 }, (_, index) =>
            currentMonth.add(index, 'month'),
         ),
      [currentMonth],
   );
   const yearMonths = useMemo(
      () =>
         Array.from({ length: 12 }, (_, index) =>
            currentMonth.year(currentMonth.year()).month(index).startOf('month'),
         ),
      [currentMonth],
   );

   const priceFor = (day: Dayjs): number | undefined =>
      priceMap[day.format('YYYY-MM-DD')] ?? defaultPrice;

   const selectDay = (day: Dayjs) => {
      if (day.isBefore(today, 'day') || !selectedRoom) return;
      setSelectedDate(day);
      setDraftPrice(priceFor(day) ?? null);
   };

   const saveDraftPrice = () => {
      if (!selectedDate || !draftPrice) return;
      updatePricingMutation.mutate({
         date: selectedDate.format('YYYY-MM-DD'),
         price: draftPrice,
      });
   };

   const compactPrice = (price: number) =>
      price >= 1000 ? `${Math.round(price / 1000).toLocaleString()}k` : price;

   /** Popover chon thang + nam */
   const monthYearPicker = (
      <div className="w-64 select-none">
         <div className="flex justify-between items-center mb-3">
            <Button
               shape="circle"
               size="small"
               icon={<LeftOutlined />}
               onClick={() => setPickerYear((year) => year - 1)}
            />
            <span className="text-base font-bold text-gray-900">
               {pickerYear}
            </span>
            <Button
               shape="circle"
               size="small"
               icon={<RightOutlined />}
               onClick={() => setPickerYear((year) => year + 1)}
            />
         </div>
         <div className="grid grid-cols-3 gap-1.5">
            {MONTHS.map((label, index) => {
               const isActive =
                  currentMonth.month() === index &&
                  currentMonth.year() === pickerYear;
               return (
                  <button
                     key={label}
                     type="button"
                     onClick={() => {
                        setCurrentMonth(
                           dayjs()
                              .year(pickerYear)
                              .month(index)
                              .startOf('month'),
                        );
                        setPickerOpen(false);
                        setViewMode('month');
                     }}
                     className={clsx(
                        'py-2 text-sm font-medium rounded-lg border transition-colors cursor-pointer',
                        isActive
                           ? 'bg-gray-900 text-white border-gray-900'
                           : 'bg-white text-gray-700 border-gray-200 hover:border-gray-900',
                     )}
                  >
                     {label}
                  </button>
               );
            })}
         </div>
      </div>
   );

   /** O ngay cho month view — ngay ngoai thang render o trong de khong lap ngay giua cac thang */
   const renderDayCell = (day: Dayjs, month: Dayjs) => {
      const inMonth = day.isSame(month, 'month');
      if (!inMonth) {
         return <span key={day.format('YYYY-MM-DD')} />;
      }
      const isPast = day.isBefore(today, 'day');
      const isToday = day.isSame(today, 'day');
      const isSelected = selectedDate?.isSame(day, 'day');
      const price = priceFor(day);
      const hasCustomPrice = priceMap[day.format('YYYY-MM-DD')] !== undefined;

      return (
         <button
            key={day.format('YYYY-MM-DD')}
            type="button"
            onClick={() => selectDay(day)}
            disabled={isPast}
            className={clsx(
               'flex flex-col justify-between items-start p-2 md:p-3 min-h-[72px] md:min-h-[90px] rounded-xl border text-left transition-all duration-150',
               isPast
                  ? 'bg-gray-50 border-gray-100 cursor-not-allowed'
                  : 'bg-white border-gray-200 cursor-pointer hover:border-gray-900',
               isSelected &&
                  '!bg-gray-900 !border-gray-900 text-white shadow-card-md',
            )}
         >
            <span
               className={clsx(
                  'text-sm font-semibold',
                  isPast && 'text-gray-300 line-through',
                  !isPast && !isSelected && 'text-gray-900',
                  isSelected && 'text-white',
                  isToday &&
                     !isSelected &&
                     'flex justify-center items-center w-6 h-6 -m-0.5 text-white bg-blue-500 rounded-full',
               )}
            >
               {day.date()}
            </span>
            {price !== undefined && (
               <span
                  className={clsx(
                     'text-[11px] md:text-xs font-medium leading-tight',
                     isPast
                        ? 'text-gray-300'
                        : isSelected
                          ? 'text-white'
                          : hasCustomPrice
                            ? 'text-blue-600'
                            : 'text-gray-500',
                  )}
               >
                  {compactPrice(price)}
                  <span className="hidden md:inline"> VND</span>
               </span>
            )}
         </button>
      );
   };

   /** Mot thang mini cho year view */
   const renderMiniMonth = (month: Dayjs) => (
      <div key={month.format('YYYY-MM')}>
         <button
            type="button"
            onClick={() => {
               setCurrentMonth(month);
               setViewMode('month');
            }}
            className="mb-2 text-sm font-bold text-gray-900 bg-transparent border-none cursor-pointer hover:text-blue-600"
         >
            {month.format('MMMM')}
         </button>
         <div className="grid grid-cols-7">
            {WEEKDAYS_MINI.map((weekday, index) => (
               <span
                  key={index}
                  className="pb-1 text-[10px] font-semibold text-center text-gray-400"
               >
                  {weekday}
               </span>
            ))}
            {buildDays(month).map((day) => {
               const inMonth = day.isSame(month, 'month');
               if (!inMonth)
                  return <span key={day.format('YYYY-MM-DD')} />;
               const isPast = day.isBefore(today, 'day');
               const isSelected = selectedDate?.isSame(day, 'day');
               const price = priceFor(day);
               return (
                  <button
                     key={day.format('YYYY-MM-DD')}
                     type="button"
                     disabled={isPast}
                     onClick={() => selectDay(day)}
                     className={clsx(
                        'flex flex-col items-center py-1 border-none rounded-md transition-colors',
                        isPast
                           ? 'bg-gray-50 cursor-not-allowed'
                           : 'bg-gray-100/80 cursor-pointer hover:bg-gray-200',
                        isSelected && '!bg-gray-900 text-white',
                     )}
                  >
                     <span
                        className={clsx(
                           'text-[11px] font-semibold leading-tight',
                           isPast
                              ? 'text-gray-300 line-through'
                              : isSelected
                                ? 'text-white'
                                : 'text-gray-800',
                        )}
                     >
                        {day.date()}
                     </span>
                     {price !== undefined && (
                        <span
                           className={clsx(
                              'text-[9px] leading-tight',
                              isPast
                                 ? 'text-gray-300'
                                 : isSelected
                                   ? 'text-white'
                                   : 'text-gray-500',
                           )}
                        >
                           {compactPrice(price)}
                        </span>
                     )}
                  </button>
               );
            })}
         </div>
      </div>
   );

   return (
      <div className="min-h-screen bg-gray-50 font-main">
         <div className="px-5 py-8 mx-auto w-full max-w-main lg:px-7">
            <h1 className="mb-6 text-2xl font-bold text-gray-900 md:text-3xl">
               Pricing calendar
            </h1>

            <div className="flex flex-col gap-5 items-start lg:flex-row">
               {/* ===== Rail trai: thumbnail phong, group theo apartment ===== */}
               <div className="flex overflow-x-auto flex-row flex-shrink-0 gap-3 p-3 w-full bg-white rounded-2xl border border-gray-100 lg:overflow-x-visible lg:flex-col lg:w-24 lg:items-center shadow-card-sm lg:sticky lg:top-24">
                  {isLoadingApartments || isLoadingRooms ? (
                     <Skeleton.Avatar active shape="square" size={56} />
                  ) : (
                     groups.map((group, groupIndex) => (
                        <div
                           key={group.apartment._id}
                           className={clsx(
                              'flex flex-row gap-2 items-center lg:flex-col',
                              groupIndex > 0 &&
                                 'pl-3 border-l border-gray-100 lg:pl-0 lg:pt-3 lg:border-l-0 lg:border-t',
                           )}
                        >
                           <Tooltip
                              title={group.apartment.title}
                              placement="right"
                           >
                              <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase whitespace-nowrap lg:max-w-[72px] lg:truncate">
                                 {group.apartment.title}
                              </span>
                           </Tooltip>
                           {group.rooms.map((room) => (
                              <Tooltip
                                 key={room._id}
                                 title={room.roomType}
                                 placement="right"
                              >
                                 <button
                                    type="button"
                                    onClick={() => {
                                       setSelectedRoom(room._id);
                                       setSelectedDate(null);
                                    }}
                                    className={clsx(
                                       'overflow-hidden flex-shrink-0 p-0 w-14 h-14 rounded-xl border-2 transition-all duration-150 cursor-pointer bg-gray-100',
                                       selectedRoom === room._id
                                          ? 'border-gray-900 shadow-card-md scale-105'
                                          : 'border-transparent opacity-70 hover:opacity-100',
                                    )}
                                 >
                                    {room.images?.[0] ? (
                                       <img
                                          src={room.images[0]}
                                          alt={room.roomType}
                                          className="object-cover w-full h-full"
                                       />
                                    ) : (
                                       <span className="flex justify-center items-center w-full h-full text-xs font-bold text-gray-400">
                                          {room.roomType?.[0]}
                                       </span>
                                    )}
                                 </button>
                              </Tooltip>
                           ))}
                        </div>
                     ))
                  )}
               </div>

               {/* ===== Calendar chinh ===== */}
               <div className="flex-1 p-5 w-full bg-white rounded-2xl border border-gray-100 min-w-0 shadow-card-sm md:p-6">
                  <div className="flex flex-wrap gap-3 justify-between items-center mb-5">
                     <Popover
                        open={pickerOpen}
                        onOpenChange={(open) => {
                           setPickerOpen(open);
                           if (open) setPickerYear(currentMonth.year());
                        }}
                        content={monthYearPicker}
                        trigger="click"
                        placement="bottomLeft"
                     >
                        <button
                           type="button"
                           className="flex gap-2 items-center text-2xl font-bold text-gray-900 bg-transparent border-none cursor-pointer hover:text-blue-600"
                        >
                           {viewMode === 'month'
                              ? currentMonth.format('MMMM YYYY')
                              : currentMonth.format('YYYY')}
                           <DownOutlined className="text-sm text-gray-400" />
                        </button>
                     </Popover>

                     <div className="flex gap-2 items-center">
                        <Button
                           shape="circle"
                           icon={<LeftOutlined />}
                           onClick={() =>
                              setCurrentMonth((month) =>
                                 viewMode === 'month'
                                    ? month.subtract(1, 'month')
                                    : month.subtract(1, 'year'),
                              )
                           }
                        />
                        <Button
                           className="rounded-full"
                           onClick={() =>
                              setCurrentMonth(dayjs().startOf('month'))
                           }
                        >
                           Today
                        </Button>
                        <Button
                           shape="circle"
                           icon={<RightOutlined />}
                           onClick={() =>
                              setCurrentMonth((month) =>
                                 viewMode === 'month'
                                    ? month.add(1, 'month')
                                    : month.add(1, 'year'),
                              )
                           }
                        />
                        <div className="flex p-1 ml-2 bg-gray-100 rounded-full">
                           {(['month', 'year'] as const).map((mode) => (
                              <button
                                 key={mode}
                                 type="button"
                                 onClick={() => setViewMode(mode)}
                                 className={clsx(
                                    'px-4 py-1.5 text-sm font-medium rounded-full border-none transition-colors cursor-pointer capitalize',
                                    viewMode === mode
                                       ? 'bg-white text-gray-900 shadow-card-sm'
                                       : 'bg-transparent text-gray-500 hover:text-gray-800',
                                 )}
                              >
                                 {mode}
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>

                  {isLoadingPricing && selectedRoom ? (
                     <Skeleton active paragraph={{ rows: 8 }} />
                  ) : viewMode === 'month' ? (
                     <>
                        <div className="grid grid-cols-7 pb-2 border-b border-gray-100">
                           {WEEKDAYS.map((weekday) => (
                              <div
                                 key={weekday}
                                 className="py-1 text-xs font-semibold text-center text-gray-400"
                              >
                                 {weekday}
                              </div>
                           ))}
                        </div>
                        <div className="overflow-y-auto pt-3 pr-1 -mr-1 space-y-8 max-h-[72vh]">
                           {monthsWindow.map((month) => (
                              <div key={month.format('YYYY-MM')}>
                                 <h3 className="mb-2 text-base font-bold text-gray-900">
                                    {month.format('MMMM YYYY')}
                                 </h3>
                                 <div className="grid grid-cols-7 gap-1.5 md:gap-2">
                                    {buildDays(month).map((day) =>
                                       renderDayCell(day, month),
                                    )}
                                 </div>
                              </div>
                           ))}
                        </div>
                     </>
                  ) : (
                     <div className="grid grid-cols-1 gap-x-8 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
                        {yearMonths.map(renderMiniMonth)}
                     </div>
                  )}
               </div>

               {/* ===== Sidebar phai ===== */}
               <div className="flex-shrink-0 space-y-5 w-full lg:w-72 lg:sticky lg:top-24">
                  {selectedDate ? (
                     <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-card-sm">
                        <p className="flex gap-2 items-center text-xs font-semibold tracking-wider text-gray-400 uppercase">
                           <CalendarOutlined /> Selected date
                        </p>
                        <h3 className="mt-1 mb-1 text-lg font-bold text-gray-900">
                           {selectedDate.format('ddd, DD MMM YYYY')}
                        </h3>
                        <p className="mb-5 text-xs text-gray-400 truncate">
                           {activeGroup?.apartment.title} ·{' '}
                           {activeRoom?.roomType}
                        </p>
                        <label className="block mb-1.5 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                           Price per night
                        </label>
                        <InputNumber
                           min={1000}
                           className="w-full"
                           size="large"
                           addonAfter="VND"
                           value={draftPrice ?? undefined}
                           onChange={(value) => setDraftPrice(value)}
                           formatter={(value) =>
                              value
                                 ? `${value}`.replace(
                                      /\B(?=(\d{3})+(?!\d))/g,
                                      ',',
                                   )
                                 : ''
                           }
                           parser={(value) =>
                              value ? Number(value.replace(/,/g, '')) : 0
                           }
                        />
                        <div className="flex gap-3 mt-5">
                           <Button
                              className="flex-1 h-10 rounded-full"
                              onClick={() => setSelectedDate(null)}
                           >
                              Cancel
                           </Button>
                           <Button
                              type="primary"
                              className="flex-1 h-10 bg-blue-500 rounded-full"
                              loading={updatePricingMutation.isPending}
                              disabled={!draftPrice}
                              onClick={saveDraftPrice}
                           >
                              Save
                           </Button>
                        </div>
                     </div>
                  ) : (
                     <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-card-sm">
                        <p className="flex gap-2 items-center text-xs font-semibold tracking-wider text-gray-400 uppercase">
                           <DollarOutlined /> Pricing
                        </p>
                        {activeRoom ? (
                           <>
                              {activeRoom.images?.[0] && (
                                 <img
                                    src={activeRoom.images[0]}
                                    alt={activeRoom.roomType}
                                    className="object-cover mt-3 w-full h-32 rounded-xl"
                                 />
                              )}
                              <p className="mt-3 text-sm font-semibold text-gray-900 truncate">
                                 {activeGroup?.apartment.title}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                 {activeRoom.roomType}
                              </p>
                              <h3 className="mt-3 text-lg font-bold text-gray-900">
                                 {defaultPrice !== undefined ? (
                                    <>
                                       {defaultPrice.toLocaleString()}{' '}
                                       <span className="text-sm font-medium text-gray-500">
                                          VND / night
                                       </span>
                                    </>
                                 ) : (
                                    <Spin size="small" />
                                 )}
                              </h3>
                              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                                 Select any date on the calendar to override
                                 its nightly price.
                              </p>
                              <div className="flex gap-2 items-center pt-4 mt-4 text-xs text-gray-400 border-t border-gray-100">
                                 <span className="w-2 h-2 bg-blue-500 rounded-full" />
                                 Dates with a custom price show in blue
                              </div>
                           </>
                        ) : (
                           <p className="mt-2 text-sm text-gray-400">
                              Pick a room thumbnail on the left to manage its
                              pricing.
                           </p>
                        )}
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
   );
};

export default HostCalendar;
