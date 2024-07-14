import { useState, useMemo } from 'react';
import { Button, Tooltip, Drawer, DatePicker } from 'antd';
import { Controller, useFormContext } from 'react-hook-form';
import { PiUserThin } from 'react-icons/pi';
import { FaChevronUp } from 'react-icons/fa';
import dayjs from 'dayjs';

interface RoomValue {
   roomId: string;
   count: number;
}

interface BookingSummaryProps {
   apartment: Apartment & { rooms: RoomOption[] };
   numberOfGuest: number;
   startDate: string;
   endDate: string;
   numberOfDays: number;
}

const BookingSummary: React.FC<BookingSummaryProps> = ({
   apartment,
   numberOfGuest,
   startDate,
   endDate,
   numberOfDays,
}) => {
   const {
      control,
      watch,
      formState: { isValid },
   } = useFormContext();
   const [drawerVisible, setDrawerVisible] = useState(false);
   const selectedRooms: RoomValue[] = watch('selectedRooms', []);
   const totalAmountPerNight = useMemo(() => {
      let total = 0;
      selectedRooms.forEach((selectedRoom: RoomValue) => {
         const room = apartment?.rooms.find(
            (r: RoomOption) => r._id === selectedRoom.roomId,
         );
         if (room) {
            total += room.price * selectedRoom.count;
         }
      });
      return total;
   }, [selectedRooms, apartment]);

   const totalAmount = useMemo(() => {
      return (
         totalAmountPerNight *
         numberOfDays *
         selectedRooms.reduce((acc, room) => acc + room.count, 0)
      );
   }, [totalAmountPerNight, numberOfDays, selectedRooms]);

   const taxAmount = useMemo(() => totalAmount * 0.11, [totalAmount]);

   const finalAmount = useMemo(
      () => totalAmount + taxAmount,
      [totalAmount, taxAmount],
   );

   return (
      <>
         <div className="hidden lg:block sticky p-6 mt-5 rounded-lg shadow min-w-[370px] shadow-gray-400 top-[140px]">
            <div className="flex flex-col gap-3 justify-center items-center w-full">
               <div className="text-xl font-medium">
                  <span>{totalAmountPerNight.toLocaleString()} VND</span>
                  <span className="text-base font-light">/ night</span>
               </div>
               <div className="flex flex-col justify-center">
                  <Controller
                     name="searchDate"
                     control={control}
                     defaultValue={[dayjs(startDate), dayjs(endDate)]}
                     render={({ field, fieldState }) => (
                        <Tooltip
                           title={fieldState.error?.message}
                           color="red"
                           open={!!fieldState.error}
                           placement="right"
                        >
                           <DatePicker.RangePicker
                              format="DD-MM-YYYY"
                              className="py-3 rounded-t-lg cursor-pointer font-main border border-gray-300"
                              inputReadOnly={true}
                              superNextIcon={null}
                              superPrevIcon={null}
                              placeholder={['Check in', 'Check out']}
                              popupClassName="rounded-full"
                              {...field}
                              disabledDate={(current) =>
                                 current && current < dayjs().startOf('day')
                              }
                           />
                        </Tooltip>
                     )}
                  />
                  <div className="flex gap-1 justify-center items-center w-full font-normal bg-white rounded-b-lg border-t-0 border-gray-300 cursor-default select-none font-main h-[48px]">
                     <PiUserThin size={25} />
                     <span className="">{`${numberOfGuest} adult · ${selectedRooms.reduce((acc, room) => acc + room.count, 0)} rooms`}</span>
                  </div>
                  <Button
                     className="mt-3 bg-blue-500 rounded-lg h-[38px] font-main text-lg"
                     htmlType="submit"
                     type="primary"
                     size="large"
                     disabled={!isValid}
                  >
                     Booking now
                  </Button>
               </div>
               <div className="flex flex-col gap-3 w-full">
                  <div className="flex justify-between items-center mt-3 w-full font-light">
                     <span>
                        <span>{totalAmountPerNight.toLocaleString()} VND</span>
                        <span>{` x ${numberOfDays} night`}</span>
                     </span>
                     <span>
                        {(totalAmountPerNight * numberOfDays).toLocaleString()}{' '}
                        VND
                     </span>
                  </div>
                  <div className="flex justify-between items-center mt-1 w-full font-light">
                     <div>
                        <span>{totalAmountPerNight.toLocaleString()} VND</span>
                        <span>{` x ${selectedRooms.reduce((acc, room) => acc + room.count, 0)} rooms`}</span>
                     </div>
                     <span>{totalAmount.toLocaleString()} VND</span>
                  </div>
                  <div className="flex justify-between items-center pt-5 w-full font-light border-t border-gray-500">
                     <span>Tax fee 11%</span>
                     <span>{`+ ${taxAmount.toLocaleString()} VND`}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 w-full font-light border-t">
                     <span className="flex-1">Total amount, tax included</span>
                     <span className="flex-2 text-right">
                        {finalAmount.toLocaleString()} VND
                     </span>
                  </div>
               </div>
            </div>
         </div>
         <div className="fixed bottom-0 z-50 left-0 right-0 px-4 py-2 bg-white border-t-2 lg:hidden">
            <div className="flex justify-between items-center mt-3">
               <div>
                  <span className="block text-lg font-medium">
                     {finalAmount.toLocaleString()} VND
                  </span>
                  <span className="block text-sm font-light">
                     {`${selectedRooms.reduce((acc, room) => acc + room.count, 0)} rooms · ${numberOfDays} nights`}
                  </span>
               </div>
               <div className="flex flex-col gap-3 align-center justify-center">
                  <span
                     className="text-white rounded-lg border hover:bg-gray-100 p-1 flex justify-center align-center"
                     onClick={() => setDrawerVisible(true)}
                  >
                     <FaChevronUp color="#000" />
                  </span>
                  <Button
                     className="bg-blue-500 rounded-lg h-[38px] font-main text-sm"
                     htmlType="submit"
                     type="primary"
                     disabled={!isValid}
                  >
                     Book now
                  </Button>
               </div>
            </div>
         </div>
         <Drawer
            placement="bottom"
            onClose={() => setDrawerVisible(false)}
            open={drawerVisible}
            height="60%"
         >
            <div className="flex flex-col gap-3 justify-center items-center w-full">
               <div className="text-xl font-medium">
                  <span>{totalAmountPerNight.toLocaleString()} VND</span>
                  <span className="text-base font-light">/ night</span>
               </div>
               <div className="flex flex-col justify-center w-full px-6">
                  <div className="flex justify-between items-center py-2 border-b">
                     <span>Check-in:</span>
                     <span>{dayjs(startDate).format('DD MMM YYYY')}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                     <span>Check-out:</span>
                     <span>{dayjs(endDate).format('DD MMM YYYY')}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                     <span>Nights:</span>
                     <span>{numberOfDays}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                     <span>Guests:</span>
                     <span>{numberOfGuest}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                     <span>Rooms:</span>
                     <span>
                        {selectedRooms.reduce(
                           (acc, room) => acc + room.count,
                           0,
                        )}
                     </span>
                  </div>
                  <div className="flex flex-col gap-3 w-full">
                     <div className="flex justify-between items-center mt-3 w-full font-light">
                        <span>
                           <span>
                              {totalAmountPerNight.toLocaleString()} VND
                           </span>
                           <span>{` x ${numberOfDays} night`}</span>
                        </span>
                        <span>
                           {(
                              totalAmountPerNight * numberOfDays
                           ).toLocaleString()}{' '}
                           VND
                        </span>
                     </div>
                     <div className="flex justify-between items-center mt-1 w-full font-light">
                        <div>
                           <span>
                              {totalAmountPerNight.toLocaleString()} VND
                           </span>
                           <span>{` x ${selectedRooms.reduce((acc, room) => acc + room.count, 0)} rooms`}</span>
                        </div>
                        <span>{totalAmount.toLocaleString()} VND</span>
                     </div>
                     <div className="flex justify-between items-center pt-5 w-full font-light border-t border-gray-500">
                        <span>Tax fee 11%</span>
                        <span>{`+ ${taxAmount.toLocaleString()} VND`}</span>
                     </div>
                     <div className="flex justify-between items-center pt-1 w-full font-light border-t">
                        <span className="flex-1">
                           Total amount, tax included
                        </span>
                        <span className="flex-2 text-right">
                           {finalAmount.toLocaleString()} VND
                        </span>
                     </div>
                  </div>
                  <Button
                     className="mt-3 bg-blue-500 rounded-lg h-[38px] font-main text-sm"
                     htmlType="submit"
                     type="primary"
                     disabled={!isValid}
                  >
                     Book
                  </Button>
               </div>
            </div>
         </Drawer>
      </>
   );
};

export default BookingSummary;
