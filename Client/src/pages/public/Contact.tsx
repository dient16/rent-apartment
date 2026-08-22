import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { Button, message } from 'antd';
import {
   MailOutlined,
   PhoneOutlined,
   EnvironmentOutlined,
   ClockCircleOutlined,
   FacebookFilled,
   InstagramFilled,
   YoutubeFilled,
   SendOutlined,
} from '@ant-design/icons';
import { InputField } from '@/components';

const contactChannels = [
   {
      icon: <EnvironmentOutlined />,
      title: 'Our office',
      lines: ['123 Elm Street, District 1', 'Ho Chi Minh City, Vietnam'],
   },
   {
      icon: <PhoneOutlined />,
      title: 'Phone',
      lines: ['+84 123 456 789', 'Mon–Sun, 8:00 – 22:00'],
   },
   {
      icon: <MailOutlined />,
      title: 'Email',
      lines: ['info@findhouse.vn', 'We reply within 24 hours'],
   },
   {
      icon: <ClockCircleOutlined />,
      title: 'Support hours',
      lines: ['24/7 for urgent booking issues', 'Live chat coming soon'],
   },
];

const ContactPage: React.FC = () => {
   const [submitting, setSubmitting] = useState(false);
   const methods = useForm({
      defaultValues: {
         name: '',
         email: '',
         subject: '',
         message: '',
      },
   });

   const onSubmit = async () => {
      // Chua co API contact o BE — gia lap gui de hoan thien UX
      setSubmitting(true);
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSubmitting(false);
      message.success(
         'Thank you for reaching out! We will get back to you within 24 hours.',
      );
      methods.reset();
   };

   return (
      <div className="bg-gray-50 font-main">
         {/* Page heading */}
         <div className="px-6 pt-14 pb-8 text-center">
            <p className="mb-3 text-sm font-semibold tracking-widest text-blue-500 uppercase">
               Contact us
            </p>
            <h1 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl">
               We would love to hear from you
            </h1>
            <p className="mx-auto max-w-xl text-gray-600">
               Questions about a booking, hosting or anything else — send us a
               message and our team will get back to you shortly.
            </p>
         </div>

         <div className="px-6 pb-20 mx-auto max-w-main">
            <div className="grid overflow-hidden bg-white rounded-3xl shadow-card-md lg:grid-cols-5">
               {/* Info panel */}
               <aside className="overflow-hidden relative p-10 text-white lg:col-span-2 bg-midnight-blue md:p-12">
                  <h2 className="mb-2 text-2xl font-bold">
                     Contact information
                  </h2>
                  <p className="mb-10 text-gray-300">
                     Choose whichever channel works best for you.
                  </p>

                  <ul className="space-y-8">
                     {contactChannels.map((channel) => (
                        <li key={channel.title} className="flex gap-4">
                           <span className="flex flex-shrink-0 justify-center items-center w-11 h-11 text-lg text-blue-300 rounded-xl bg-white/10">
                              {channel.icon}
                           </span>
                           <div>
                              <p className="font-semibold">{channel.title}</p>
                              {channel.lines.map((line) => (
                                 <p
                                    key={line}
                                    className="text-sm text-gray-300"
                                 >
                                    {line}
                                 </p>
                              ))}
                           </div>
                        </li>
                     ))}
                  </ul>

                  <div className="flex gap-3 mt-12">
                     {[
                        { icon: <FacebookFilled />, label: 'Facebook' },
                        { icon: <InstagramFilled />, label: 'Instagram' },
                        { icon: <YoutubeFilled />, label: 'YouTube' },
                     ].map((social) => (
                        <a
                           key={social.label}
                           href="#"
                           aria-label={social.label}
                           className="flex justify-center items-center w-10 h-10 text-white rounded-full transition-colors bg-white/10 hover:bg-blue-500"
                        >
                           {social.icon}
                        </a>
                     ))}
                  </div>

                  {/* Hoa tiet trang tri */}
                  <div className="absolute right-0 bottom-0 w-40 h-40 rounded-full translate-x-1/3 translate-y-1/3 bg-blue-500/20" />
                  <div className="absolute right-16 bottom-16 w-16 h-16 rounded-full bg-blue-400/20" />
               </aside>

               {/* Form panel */}
               <div className="p-10 lg:col-span-3 md:p-12">
                  <h2 className="mb-1 text-2xl font-bold text-gray-900">
                     Send us a message
                  </h2>
                  <p className="mb-8 text-gray-500">
                     Fill in the form and we will reply to your email.
                  </p>
                  <FormProvider {...methods}>
                     <form
                        onSubmit={methods.handleSubmit(onSubmit)}
                        className="space-y-5"
                     >
                        <div className="grid gap-5 md:grid-cols-2">
                           <InputField
                              name="name"
                              label="Full name"
                              rules={{ required: 'Name is required' }}
                              type="text"
                              className="w-full"
                           />
                           <InputField
                              name="email"
                              label="Email address"
                              rules={{
                                 required: 'Email is required',
                                 pattern: {
                                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                    message: 'Invalid email address',
                                 },
                              }}
                              type="text"
                              className="w-full"
                           />
                        </div>
                        <InputField
                           name="subject"
                           label="Subject"
                           rules={{ required: 'Subject is required' }}
                           type="text"
                           className="w-full"
                        />
                        <InputField
                           name="message"
                           label="Message"
                           rules={{ required: 'Message is required' }}
                           type="textarea"
                           rows={5}
                           className="w-full"
                        />
                        <div className="flex justify-end">
                           <Button
                              type="primary"
                              size="large"
                              htmlType="submit"
                              loading={submitting}
                              className="px-10 h-12 text-base bg-blue-500 rounded-full hover:bg-blue-600"
                           >
                              Send message <SendOutlined />
                           </Button>
                        </div>
                     </form>
                  </FormProvider>
               </div>
            </div>

            {/* Map */}
            <div className="overflow-hidden mt-10 h-72 rounded-3xl shadow-card-lg md:h-96">
               <iframe
                  title="Find House office location"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.4241674197956!2d106.69742617480579!3d10.771594989375862!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f4670702e31%3A0xa5777fb3a5bb4be7!2zQuG6v24gQmFjaCDEkOG6sW5n!5e0!3m2!1svi!2s!4v1700000000000!5m2!1svi!2s"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
               />
            </div>
         </div>
      </div>
   );
};

export default ContactPage;
