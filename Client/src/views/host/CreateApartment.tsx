import React, { useEffect, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, message, Steps } from 'antd';
import {
   ArrowLeftOutlined,
   CheckOutlined,
   LeftOutlined,
   RightOutlined,
} from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from '@/lib/router-compat';
import { apiCreateApartment } from '@/apis';
import { path } from '@/utils/constant';
import {
   Step1FormApartment as Step1,
   Step2FormApartment as Step2,
   Step3FormApartment as Step3,
} from '@/components';

const steps = [
   {
      title: 'Apartment details',
      description: 'Name, description and location',
      content: Step1,
   },
   {
      title: 'Rooms & images',
      description: 'Add room types and photos',
      content: Step2,
   },
   {
      title: 'Policies',
      description: 'House rules and check-in info',
      content: Step3,
   },
];

const DRAFT_KEY = 'CREATE_APARTMENT_DRAFT';

const loadDraft = (): Partial<Apartment> | undefined => {
   try {
      if (typeof window === 'undefined') return undefined;
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : undefined;
   } catch {
      return undefined;
   }
};

const CreateApartment: React.FC = () => {
   const methods = useForm<Apartment>({ defaultValues: loadDraft() });
   const navigate = useNavigate();
   const queryClient = useQueryClient();
   const [searchParams, setSearchParams] = useSearchParams();

   // The current step lives on the URL (?step=1..3) so refresh/back-forward keep it
   const step = Math.min(
      Math.max((parseInt(searchParams.get('step') || '1', 10) || 1) - 1, 0),
      steps.length - 1,
   );
   const setStep = (newStep: number) => {
      setSearchParams({ step: String(newStep + 1) });
   };
   const [showBackButton, setShowBackButton] = useState<boolean>(true);
   const [showNextButton, setShowNextButton] = useState<boolean>(true);

   const mutation = useMutation({
      mutationFn: apiCreateApartment,
      onSuccess: (response) => {
         if (response.success) {
            message.success('Your listing has been created!');
            localStorage.removeItem(DRAFT_KEY);
            queryClient.invalidateQueries({ queryKey: ['apartments-host'] });
            navigate(`${path.HOST_ROOT}${path.HOST_LISTINGS}`);
         } else {
            message.error(response.message || 'Failed to create apartment');
         }
      },
      onError: () => {
         message.error('Failed to create apartment. Please try again.');
      },
   });

   useEffect(() => {
      if (step !== 1) {
         setShowBackButton(true);
         setShowNextButton(true);
      }
   }, [step]);

   // Auto-save the draft to localStorage — F5 keeps the data
   useEffect(() => {
      const subscription = methods.watch((values) => {
         try {
            localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
         } catch {
            // storage full/blocked: ignore, never break the form flow
         }
      });
      return () => subscription.unsubscribe();
   }, [methods]);

   const handleStepChange = async (newStep: number) => {
      // Going back needs no validation
      if (newStep < step) {
         setStep(newStep);
         return;
      }

      if (step === 1) {
         const isValid = await methods.trigger(['rooms'], {
            shouldFocus: true,
         });
         if (!isValid) {
            message.error(
               'Please complete all room details before proceeding.',
            );
            return;
         }
      }

      if (step === 2) {
         const isValid = await methods.trigger(
            ['houseRules', 'checkInTime', 'checkOutTime', 'safetyInfo'],
            { shouldFocus: true },
         );
         if (!isValid) {
            message.error(
               'Please complete all additional details before proceeding.',
            );
            return;
         }
      }

      const result = await methods.trigger();
      if (result) {
         setStep(newStep);
      }
   };

   const onSubmit = (data: Apartment) => {
      const mappedData = {
         ...data,
         rooms: data.rooms.map((room) => ({
            ...room,
            images: room.images.map((img) =>
               typeof img === 'string'
                  ? img
                  : img.response.url.split('/').pop() || '',
            ),
         })),
      };
      mutation.mutate(mappedData);
   };

   const StepComponent = steps[step].content;
   const stepItems = steps.map((item) => ({
      title: item.title,
      content: item.description,
   }));

   return (
      <FormProvider {...methods}>
         <div className="min-h-screen bg-gray-50 font-main">
            <div className="px-5 pt-3 pb-8 mx-auto w-full max-w-main lg:px-7">
               <Link
                  to={`${path.HOST_ROOT}${path.HOST_LISTINGS}`}
                  className="inline-flex gap-2 items-center mb-5 text-sm font-medium text-gray-500 hover:text-blue-600"
               >
                  <ArrowLeftOutlined /> Rental listings
               </Link>
               <h1 className="mb-6 text-2xl font-bold text-gray-900 md:text-3xl">
                  Create new listing
               </h1>

               {/* Steps ngang cho mobile */}
               <div className="p-4 mb-5 bg-white rounded-2xl border border-gray-100 lg:hidden shadow-card-sm">
                  <Steps
                     current={step}
                     onChange={handleStepChange}
                     items={stepItems.map(({ title }) => ({ title }))}
                     size="small"
                     responsive={false}
                  />
               </div>

               <div className="flex gap-6 items-start">
                  {/* Sidebar steps (desktop) */}
                  <div className="hidden flex-shrink-0 p-6 w-72 bg-white rounded-2xl border border-gray-100 lg:block shadow-card-sm sticky top-24">
                     <Steps
                        orientation="vertical"
                        current={step}
                        onChange={handleStepChange}
                        items={stepItems}
                     />
                     <div className="pt-5 mt-5 text-xs leading-relaxed text-gray-400 border-t border-gray-100">
                        Your listing will be visible in search results right
                        after you submit it.
                     </div>
                  </div>

                  {/* Form */}
                  <div className="flex-1 min-w-0 bg-white rounded-2xl border border-gray-100 shadow-card-sm">
                     <form onSubmit={methods.handleSubmit(onSubmit)}>
                        <div className="p-6 md:p-8 min-h-[560px]">
                           <h2 className="mb-1 text-lg font-bold text-gray-900">
                              {steps[step].title}
                           </h2>
                           <p className="mb-6 text-sm text-gray-500">
                              {steps[step].description}
                           </p>
                           {step === 1 ? (
                              <Step2
                                 setShowBackButton={setShowBackButton}
                                 setShowNextButton={setShowNextButton}
                              />
                           ) : (
                              <StepComponent />
                           )}
                        </div>

                        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 md:px-8">
                           {showBackButton && step > 0 ? (
                              <Button
                                 onClick={() => handleStepChange(step - 1)}
                                 icon={<LeftOutlined />}
                                 size="large"
                                 className="h-11 rounded-full"
                              >
                                 Back
                              </Button>
                           ) : (
                              <span />
                           )}
                           <div className="flex gap-2 items-center text-xs text-gray-400">
                              Step {step + 1} of {steps.length}
                           </div>
                           {showNextButton && step < steps.length - 1 && (
                              <Button
                                 type="primary"
                                 onClick={() => handleStepChange(step + 1)}
                                 size="large"
                                 className="px-7 h-11 bg-blue-500 rounded-full"
                              >
                                 Next <RightOutlined />
                              </Button>
                           )}
                           {step === steps.length - 1 && (
                              <Button
                                 type="primary"
                                 htmlType="submit"
                                 size="large"
                                 icon={<CheckOutlined />}
                                 loading={mutation.isPending}
                                 className="px-7 h-11 bg-blue-500 rounded-full"
                              >
                                 Publish listing
                              </Button>
                           )}
                           {!showNextButton && step < steps.length - 1 && (
                              <span />
                           )}
                        </div>
                     </form>
                  </div>
               </div>
            </div>
         </div>
      </FormProvider>
   );
};

export default CreateApartment;
