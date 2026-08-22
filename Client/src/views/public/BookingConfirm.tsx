import React, { useMemo, useState } from 'react';
import { Button, Result, Spin, Steps, Tabs } from 'antd';
import { CustomerInfo, Payment } from '@/components';
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

   const { baseAmount, taxAmount, totalAmount } = useMemo(() => {
      const rooms = roomIds.map((roomId, index) => {
         const room = roomData?.rooms.find((r) => r._id === roomId);
         return {
            price: room?.price || 0,
            roomNumber: roomNumbers[index],
         };
      });

      return calculateTotalAmount(numberOfDays, rooms);
   }, [numberOfDays, roomData, roomIds, roomNumbers]);

   const handleCompletion = (data: CustomerBooking) => {
      setCustomerInfo({
         ...data,
         checkInTime: startDate,
         checkOutTime: endDate,
         totalPrice: totalAmount,
      });
      setActiveTab('checkout');
      setStep(2);
   };

   return isFetching ? (
      <div className="min-h-screen">
         <Spin fullscreen size="large" spinning={true} />
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
      <div className="w-full flex items-center justify-center pt-3 mb-10 px-4 md:px-6 lg:px-10 bg-gray-100">
         <div className="max-w-main w-full mt-5">
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
               <div className="lg:col-span-4 flex flex-col items-center justify-center gap-5">
                  <div className="w-full flex flex-col items-start gap-3 bg-white rounded-lg p-4">
                     <div className="font-semibold text-lg">
                        {roomData.title}
                     </div>
                     <div>
                        {`${roomData.location.street} ${roomData.location.ward} ${roomData.location.district} ${roomData.location.province}`}
                     </div>

                     <div className="flex items-center gap-2">
                        <span className="px-4 py-1.5 bg-green-200 rounded-full text-sm uppercase text-center tracking-normal leading-4 whitespace-nowrap text-green-700 font-medium">
                           9.3
                        </span>
                        <span>10 reviews</span>
                     </div>
                  </div>
                  <div className="p-4 w-full bg-white rounded-lg space-y-5">
                     <h3 className="font-semibold text-lg">
                        Your booking details
                     </h3>
                     <div className="flex items-center gap-2 justify-center">
                        <div className="border rounded-lg p-3">
                           <div className="text-sm">Check-in</div>
                           <div className="font-semibold text-md">
                              {moment(startDate).format('ddd, DD MMM YYYY')}
                           </div>
                           <div className="text-sm">14:00 - 20:00</div>
                        </div>
                        <div className="relative flex items-center">
                           <span className="md:w-[50px] w-[30px] h-[1px] bg-gray-400 inline-block"></span>
                           <span className="absolute left-0 w-1 h-1 bg-gray-400 rounded-full"></span>
                           <span className="absolute right-0 w-1 h-1 bg-gray-400 rounded-full"></span>
                        </div>
                        <div className="border rounded-lg p-3">
                           <div className="text-sm">Check-out</div>
                           <div className="font-semibold text-md">
                              {moment(endDate).format('ddd, DD MMM YYYY')}
                           </div>
                           <div className="text-sm">8:00 - 12:00</div>
                        </div>
                     </div>
                     <div>
                        <div>Total length of stay:</div>
                        <div className="font-semibold">{`${numberOfDays} night`}</div>
                     </div>
                     <div className="border-t border-gray-400"></div>
                     <div>
                        <div>You selected</div>
                        <div className="font-semibold">{`${
                           roomNumbers.length
                        } room(s) ${roomNumbers.reduce(
                           (a, b) => a + b,
                           0,
                        )} adults`}</div>
                     </div>
                     <div className="border-t border-gray-400 my-2"></div>
                     <div>
                        {roomData.rooms.map((room, index) => (
                           <div key={index} className="mb-4">
                              <div className="flex items-center text-sm text-gray-600 mb-1">
                                 <span className="text-lg text-black">
                                    {room.roomType}
                                 </span>
                              </div>

                              <div className="flex items-center text-sm text-gray-500 mb-1">
                                 <FaBed className="mr-2" />
                                 <span className="text-md">{room.bedType}</span>
                              </div>

                              <div className="flex items-center text-sm text-gray-500 mb-1">
                                 <FaRulerCombined className="mr-2" />
                                 <span className="text-md">{room.size} m²</span>
                              </div>

                              <div className="flex items-center text-sm text-gray-500 mb-1">
                                 <FaUsers className="mr-2" />
                                 <span className="text-md">
                                    {room.numberOfGuest} guests
                                 </span>
                              </div>
                           </div>
                        ))}
                     </div>

                     <div className="border-t border-gray-400 my-2"></div>
                     <div>
                        <div className="text-sm text-gray-500">
                           You selected
                        </div>
                        <div className="font-semibold text-md">
                           {roomNumbers.length} room(s){' '}
                           {roomNumbers.reduce((a, b) => a + b, 0)} adults
                        </div>
                     </div>
                  </div>
                  <div className="w-full rounded-lg bg-white overflow-hidden">
                     <div className="w-full p-5">
                        <div className="font-semibold text-lg mb-3">
                           Your price summary
                        </div>
                        <div className="flex items-center justify-between">
                           <span>Original price</span>
                           <span>{`${baseAmount.toLocaleString()} VND`}</span>
                        </div>
                        <div className="flex items-center justify-between">
                           <span>Including taxes and fees 11%</span>
                           <span>{`+ ${taxAmount.toLocaleString()} VND`}</span>
                        </div>
                     </div>
                     <div className="flex items-center justify-between p-5 bg-blue-50">
                        <div>
                           <span className="text-3xl font-bold">Total</span>
                        </div>
                        <div className="flex flex-col items-end">
                           <div className="font-semibold text-2xl">{`${totalAmount.toLocaleString()} VND`}</div>
                           <div>Includes taxes and charges</div>
                        </div>
                     </div>
                     <div className=""></div>
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
