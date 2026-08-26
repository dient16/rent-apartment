import React, { useState } from 'react';
import { Button, Result, Steps, Tabs } from 'antd';
import { CustomerInfo, FullscreenLoader, Payment } from '@/components';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from '@/lib/router-compat';
import { useQuery } from '@tanstack/react-query';
import { apiGetRoomCheckout } from '@/apis';
import moment from 'moment';
import { path } from '@/utils/constant';
import { FaBed, FaRulerCombined, FaUsers } from 'react-icons/fa';
const calculateTotalAmount = (
   numberOfDays: number,
   rooms: { price: number; roomNumber: number }[],
) => {
   const baseAmount = rooms.reduce((total, room) => {
      const roomTotal =
         (numberOfDays === 0 ? 1 : numberOfDays) * room.price * room.roomNumber;
      return total + roomTotal;
   }, 0);

   const taxAmount = baseAmount * 0.11;
   const totalAmount = baseAmount + taxAmount;

   return {
      baseAmount,
      taxAmount,
      totalAmount,
   };
};
const BookingConfirm: React.FC = () => {
   const [activeTab, setActiveTab] = useState<string>('customerInformation');
   const [step, setStep] = useState<number>(1);
   const { handleSubmit, control } = useForm<CustomerBooking>();
   const [searchParams] = useSearchParams();
   const [CustomerInfoData, setCustomerInfo] = useState(null);
   const navigate = useNavigate();

   const startDate = searchParams.get('startDate');
   const numberOfGuest = parseInt(searchParams.get('numberOfGuest') || '1', 10) || 1;
   const endDate = searchParams.get('endDate');

   const roomIds = searchParams.getAll('roomIds[]');
   const roomNumbers = searchParams
      .getAll('roomNumbers[]')
      .map((num) => parseInt(num, 10));

   const checkIn = startDate ? moment(startDate) : null;
   const checkOut = endDate ? moment(endDate) : null;

   const numberOfDays = Math.max(checkOut.diff(checkIn, 'days'), 1);

   const { data: { data: roomData } = {}, isFetching } = useQuery({
      queryKey: ['apartment-confirm', searchParams.toString()],
      queryFn: () =>
         apiGetRoomCheckout({
            roomIds: roomIds,
            roomNumbers: roomNumbers,
            params: new URLSearchParams({
               startDate: startDate,
               endDate: endDate,
            }).toString(),
         }),
      staleTime: 0,
   });

   const { baseAmount, taxAmount, totalAmount } = calculateTotalAmount(
      numberOfDays,
      roomIds.map((roomId, index) => ({
         price: roomData?.rooms.find((r) => r._id === roomId)?.price || 0,
         roomNumber: roomNumbers[index],
      })),
   );

   const totalRooms = roomNumbers.reduce((sum, count) => sum + count, 0);

   const handleCompletion = (data: CustomerBooking) => {
      setCustomerInfo({
         ...data,
         checkInTime: startDate,
         checkOutTime: endDate,
         totalPrice: totalAmount,
         numberOfGuest,
      });
      setActiveTab('checkout');
      setStep(2);
   };

   return isFetching ? (
      <div className="min-h-screen">
         <FullscreenLoader spinning />
      </div>
   ) : !roomData ? (
      <div className="min-h-screen flex items-center justify-center">
         <Result
            status="500"
            title="500"
            subTitle="Sorry, something went wrong."
            extra={
               <Button
                  size="large"
                  className="bg-blue-500"
                  type="primary"
                  onClick={() => navigate(`/${path.HOME}`)}
               >
                  Back Home
               </Button>
            }
         />
      </div>
   ) : (
      <div className="flex justify-center px-4 pt-3 pb-10 w-full bg-gray-50 md:px-6 lg:px-10 min-h-screen">
         <div className="max-w-main w-full mt-2">
            <Steps
               size="small"
               current={step}
               className="font-main"
               items={[
                  { title: 'Your selection' },
                  { title: 'Your details' },
                  { title: 'Confirm your reservation' },
               ]}
            />
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-7 mt-7 font-light">
               <div className="flex flex-col gap-5 lg:col-span-4">
                  <div className="p-5 w-full bg-white rounded-2xl border border-gray-100 shadow-card-sm">
                     <div className="text-lg font-semibold text-gray-900">
                        {roomData.title}
                     </div>
                     <div className="mt-1 text-sm text-gray-500">
                        {[
                           roomData.location.street,
                           roomData.location.ward,
                           roomData.location.district,
                           roomData.location.province,
                        ]
                           .filter(Boolean)
                           .join(', ')}
                     </div>
                  </div>

                  <div className="p-5 space-y-5 w-full bg-white rounded-2xl border border-gray-100 shadow-card-sm">
                     <h3 className="text-lg font-semibold text-gray-900">
                        Your booking details
                     </h3>

                     <div className="flex gap-2 items-center">
                        <div className="flex-1 p-3 rounded-xl border border-gray-200">
                           <div className="text-xs tracking-wide text-gray-400 uppercase">
                              Check-in
                           </div>
                           <div className="font-semibold text-gray-900">
                              {moment(startDate).format('ddd, DD MMM YYYY')}
                           </div>
                           <div className="text-xs text-gray-500">14:00 - 20:00</div>
                        </div>
                        <div className="flex relative flex-shrink-0 items-center">
                           <span className="md:w-[40px] w-[24px] h-px bg-gray-300 inline-block" />
                           <span className="absolute left-0 w-1 h-1 bg-gray-300 rounded-full" />
                           <span className="absolute right-0 w-1 h-1 bg-gray-300 rounded-full" />
                        </div>
                        <div className="flex-1 p-3 rounded-xl border border-gray-200">
                           <div className="text-xs tracking-wide text-gray-400 uppercase">
                              Check-out
                           </div>
                           <div className="font-semibold text-gray-900">
                              {moment(endDate).format('ddd, DD MMM YYYY')}
                           </div>
                           <div className="text-xs text-gray-500">8:00 - 12:00</div>
                        </div>
                     </div>

                     <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-500">
                           Total length of stay
                        </span>
                        <span className="font-semibold text-gray-900">
                           {numberOfDays} night{numberOfDays > 1 ? 's' : ''}
                        </span>
                     </div>

                     <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-500">You selected</span>
                        <span className="font-semibold text-gray-900">
                           {totalRooms} room{totalRooms > 1 ? 's' : ''}
                        </span>
                     </div>

                     <div className="pt-4 space-y-4 border-t border-gray-100">
                        {roomData.rooms.map((room, index) => (
                           <div key={room._id ?? index}>
                              <div className="mb-1.5 font-medium text-gray-900">
                                 {room.roomType}
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                                 <span className="flex gap-1.5 items-center">
                                    <FaBed /> {room.bedType}
                                 </span>
                                 <span className="flex gap-1.5 items-center">
                                    <FaRulerCombined /> {room.size} m²
                                 </span>
                                 <span className="flex gap-1.5 items-center">
                                    <FaUsers /> {room.numberOfGuest} guest
                                    {room.numberOfGuest > 1 ? 's' : ''}
                                 </span>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>

                  <div className="overflow-hidden w-full bg-white rounded-2xl border border-gray-100 shadow-card-sm">
                     <div className="p-5 space-y-2">
                        <div className="mb-3 text-lg font-semibold text-gray-900">
                           Your price summary
                        </div>
                        <div className="flex justify-between items-center text-sm">
                           <span className="text-gray-500">Original price</span>
                           <span className="text-gray-900">{`${baseAmount.toLocaleString()} VND`}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                           <span className="text-gray-500">
                              Including taxes and fees 11%
                           </span>
                           <span className="text-gray-900">{`+ ${taxAmount.toLocaleString()} VND`}</span>
                        </div>
                     </div>
                     <div className="flex justify-between items-center p-5 bg-blue-50">
                        <span className="text-xl font-bold text-gray-900">Total</span>
                        <div className="flex flex-col items-end">
                           <div className="text-2xl font-bold text-gray-900">{`${totalAmount.toLocaleString()} VND`}</div>
                           <div className="text-xs text-gray-500">
                              Includes taxes and charges
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="lg:col-span-6">
                  <Tabs
                     activeKey={activeTab}
                     items={[
                        {
                           key: 'customerInformation',
                           label: null,
                           children: (
                              <form onSubmit={handleSubmit(handleCompletion)}>
                                 <CustomerInfo control={control} />
                              </form>
                           ),
                        },
                        {
                           key: 'checkout',
                           label: null,
                           children: (
                              <Payment
                                 setActiveTab={setActiveTab}
                                 setStep={setStep}
                                 amount={totalAmount}
                                 nameRoom={roomData.title}
                                 checkInTime={startDate}
                                 checkOutTime={endDate}
                                 rooms={roomData.rooms.map((room, index) => ({
                                    roomId: room._id,
                                    roomNumber: roomNumbers[index],
                                 }))}
                                 CustomerInfoData={CustomerInfoData}
                              />
                           ),
                        },
                     ]}
                     renderTabBar={() => null}
                  />
               </div>
            </div>
         </div>
      </div>
   );
};

export default BookingConfirm;
