import React, { useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import CheckoutForm from './CheckoutForm';
import { apiBooking, apiCreateStripePayment } from '@/apis';
import { Alert, Button, Flex, Radio, Skeleton } from 'antd';
import icons from '@/utils/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@/lib/router-compat';
import FullscreenLoader from '@/components/FullscreenLoader/FullscreenLoader';
const { IoIosArrowBack, FaLock } = icons;

// Module scope: calling loadStripe on every render restarts the script load each time.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

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
   const queryClient = useQueryClient();
   const [selectTypePayment, setSelectTypePayment] = useState('before');
   const navigate = useNavigate();
   const bookingMutation = useMutation({
      mutationFn: apiBooking,
   });
   const {
      data: clientSecret,
      isFetching: isPreparingCard,
      isError: cardSetupFailed,
      refetch: retryCardSetup,
   } = useQuery({
      queryKey: ['payment-intent', amount],
      queryFn: async () => {
         const response = await apiCreateStripePayment({ amount });
         if (!response?.data) {
            throw new Error(response?.message || 'Could not start the payment');
         }
         return response.data as string;
      },
      enabled: selectTypePayment === 'before' && amount > 0,
      retry: false,
      staleTime: Infinity,
      // A failed intent must not be re-requested every time the tab regains focus —
      // the user retries explicitly with the button in the error card.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
   });
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
   const goBackToDetails = () => {
      setActiveTab('customerInformation');
      setStep(1);
   };

   const backButton = (
      <Button
         size="large"
         shape="circle"
         type="primary"
         ghost
         className="flex justify-center items-center"
         aria-label="Back to your details"
         onClick={goBackToDetails}
         icon={<IoIosArrowBack size={20} />}
      />
   );

   return (
      <>
         <FullscreenLoader spinning={bookingMutation.isPending} />
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
                  {isPreparingCard ? (
                     <div className="p-4 bg-white rounded-lg sm:p-8">
                        <Skeleton active paragraph={{ rows: 4 }} />
                     </div>
                  ) : cardSetupFailed ? (
                     /* Without this the whole card section rendered empty and the user
                        was stuck with no back button and no other payment option. */
                     <div className="p-4 space-y-5 bg-white rounded-lg sm:p-8">
                        <Alert
                           type="error"
                           showIcon
                           message="Card payment is unavailable right now"
                           description="We could not reach the payment provider. You can try again, pay when you check in, or go back and review your details."
                        />
                        <Flex className="flex flex-col gap-3 items-center sm:flex-row sm:justify-between sm:gap-0">
                           {backButton}
                           <div className="flex flex-col gap-3 sm:flex-row">
                              <Button
                                 size="large"
                                 onClick={() => setSelectTypePayment('after')}
                              >
                                 Pay upon check-in
                              </Button>
                              <Button
                                 size="large"
                                 type="primary"
                                 className="bg-blue-500"
                                 onClick={() => retryCardSetup()}
                              >
                                 Try again
                              </Button>
                           </div>
                        </Flex>
                     </div>
                  ) : clientSecret ? (
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
                  ) : null}
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
                     {backButton}

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
