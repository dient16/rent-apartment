import React, { useState } from 'react';
import { Button, Input, message } from 'antd';
import {
   CreditCardOutlined,
   LockOutlined,
   PlusOutlined,
} from '@ant-design/icons';

/** Payment management UI — backend not wired yet, the form is visual only */
const PaymentInformation: React.FC = () => {
   const [showForm, setShowForm] = useState(false);

   const handleSave = () => {
      message.info('Saving payment methods is coming soon');
   };

   return (
      <div className="w-full font-main">
         <div className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-card-sm">
            <div className="flex flex-wrap gap-4 justify-between items-center p-6 border-b border-gray-100 md:p-8">
               <div>
                  <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
                     Payment information
                  </h1>
                  <p className="mt-0.5 text-sm text-gray-500">
                     Manage the cards you use to pay for your stays.
                  </p>
               </div>
               {!showForm && (
                  <Button
                     type="primary"
                     icon={<PlusOutlined />}
                     className="h-10 bg-blue-500 rounded-full"
                     onClick={() => setShowForm(true)}
                  >
                     Add card
                  </Button>
               )}
            </div>

            <div className="p-6 md:p-8">
               {!showForm ? (
                  <div className="flex flex-col items-center py-14 text-center">
                     <span className="flex justify-center items-center mb-5 w-16 h-16 text-2xl text-blue-500 bg-blue-50 rounded-full">
                        <CreditCardOutlined />
                     </span>
                     <h2 className="mb-1 text-base font-semibold text-gray-900">
                        No saved cards yet
                     </h2>
                     <p className="mb-6 max-w-sm text-sm text-gray-500">
                        Add a card to check out faster. Your details are
                        encrypted and stored securely with Stripe.
                     </p>
                     <Button
                        icon={<PlusOutlined />}
                        className="h-10 rounded-full"
                        onClick={() => setShowForm(true)}
                     >
                        Add your first card
                     </Button>
                  </div>
               ) : (
                  <div className="max-w-lg">
                     <div className="grid gap-4">
                        <div>
                           <label className="block mb-1.5 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                              Cardholder name
                           </label>
                           <Input
                              size="large"
                              placeholder="NGUYEN VAN A"
                              className="rounded-lg"
                           />
                        </div>
                        <div>
                           <label className="block mb-1.5 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                              Card number
                           </label>
                           <Input
                              size="large"
                              placeholder="1234 5678 9012 3456"
                              prefix={
                                 <CreditCardOutlined className="text-gray-400" />
                              }
                              maxLength={19}
                              className="rounded-lg"
                           />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="block mb-1.5 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                 Expiry date
                              </label>
                              <Input
                                 size="large"
                                 placeholder="MM/YY"
                                 maxLength={5}
                                 className="rounded-lg"
                              />
                           </div>
                           <div>
                              <label className="block mb-1.5 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                 CVC
                              </label>
                              <Input.Password
                                 size="large"
                                 placeholder="123"
                                 maxLength={4}
                                 className="rounded-lg"
                              />
                           </div>
                        </div>
                     </div>

                     <p className="flex gap-2 items-center mt-4 text-xs text-gray-400">
                        <LockOutlined /> Card details are processed securely —
                        we never store your full card number.
                     </p>

                     <div className="flex gap-3 mt-6">
                        <Button
                           className="h-10 rounded-full"
                           onClick={() => setShowForm(false)}
                        >
                           Cancel
                        </Button>
                        <Button
                           type="primary"
                           className="px-7 h-10 bg-blue-500 rounded-full"
                           onClick={handleSave}
                        >
                           Save card
                        </Button>
                     </div>
                  </div>
               )}
            </div>
         </div>
      </div>
   );
};

export default PaymentInformation;
