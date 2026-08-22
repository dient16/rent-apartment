import React, { useEffect, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import CheckoutForm from './CheckoutForm';
import { apiBooking, apiCreateStripePayment } from '@/apis';
import { Button, Flex, Radio, Spin } from 'antd';
import icons from '@/utils/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@/lib/router-compat';
const { IoIosArrowBack, FaLock } = icons;

interface PaymentProps {
   setActiveTab: (activeTab: string) => void;
   setStep: (step: number) => void;
   amount: number;
   nameRoom: string;
   checkInTime: string | null;
   checkOutTime: string | null;
   rooms: { roomId: string; roomNumber: number }[];
   CustomerInfoData: CustomerBooking;
}
const Payment: React.FC<PaymentProps> = ({
   setActiveTab,
   setStep,
   amount,
   nameRoom,
   checkInTime,
   checkOutTime,
   rooms,
   CustomerInfoData,
}) => {
   const [clientSecret, setClientSecret] = useState('');
   const queryClient = useQueryClient();
   const stripePromise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
   );
   const [selectTypePayment, setSelectTypePayment] = useState('before');
   const navigate = useNavigate();
   const bookingMutation = useMutation({
      mutationFn: apiBooking,
   });
   useEffect(() => {
      const getSecret = async () => {
         const secretKey = await apiCreateStripePayment({ amount: amount });
         setClientSecret(secretKey.data);
      };
      getSecret();
   }, [amount]);
   const handleBooking = async () => {
      bookingMutation.mutate(
         {
            ...CustomerInfoData,
            checkInTime,
            checkOutTime,
            rooms,
            totalPrice: amount,
         },
         {
            onSuccess: (response: Res) => {
               if (response.success) {
                  queryClient.invalidateQueries({
                     queryKey: ['my-booking'],
                  });
                  navigate(`/booking-completion/${response.data._id}`);
               }
            },
         },
      );
   };
   return (
      <>
         <Spin
            size="large"
            spinning={bookingMutation.isPending}
            fullscreen={bookingMutation.isPending}
         />
         <div className="mx-2 space-y-5">
            <div className="bg-white rounded-lg p-4 sm:p-8">
               <Radio.Group
                  className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5"
                  value={selectTypePayment}
                  onChange={(e) => setSelectTypePayment(e.target.value)}
               >
                  <Radio
                     className="text-base sm:text-lg font-normal"
                     value="before"
                  >
                     Payment by card
                  </Radio>
                  <Radio
                     className="text-base sm:text-lg font-normal"
                     value="after"
                  >
                     Pay upon check-in
                  </Radio>
               </Radio.Group>
            </div>
            {selectTypePayment === 'before' && (
               <div>
                  {clientSecret && (
                     <Elements
                        stripe={stripePromise}
                        options={{ clientSecret }}
                     >
                        <CheckoutForm
                           setActiveTab={setActiveTab}
                           setStep={setStep}
                           amount={amount}
                           checkInTime={checkInTime}
                           checkOutTime={checkOutTime}
                           rooms={rooms}
                           CustomerInfoData={CustomerInfoData}
                        />
                     </Elements>
                  )}
               </div>
            )}
            {selectTypePayment === 'after' && (
               <div className="space-y-5">
                  <div className="p-4 sm:p-5 bg-white rounded-lg">
                     <div className="text-lg font-medium">
                        You have chosen to pay upon check-in
                     </div>
                     <div className="text-sm sm:text-base">
                        {` Your payment will be processed by ${nameRoom} as you have chosen to pay upon check-in.`}
                     </div>
                  </div>
                  <Flex className="flex flex-col sm:flex-row items-center sm:justify-between gap-3 sm:gap-0">
                     <Button
                        size="large"
                        shape="circle"
                        type="primary"
                        ghost
                        className="flex items-center justify-center"
                        onClick={() => {
                           setActiveTab('customerInformation');
                           setStep(1);
                        }}
                        icon={<IoIosArrowBack size={20} />}
                     />

                     <Button
                        htmlType="submit"
                        type="primary"
                        size="large"
                        className="bg-blue-500 flex items-center justify-center mt-3 sm:mt-0"
                        icon={<FaLock />}
                        onClick={handleBooking}
                     >
                        Complete booking
                     </Button>
                  </Flex>
               </div>
            )}
         </div>
      </>
   );
};

export default Payment;
