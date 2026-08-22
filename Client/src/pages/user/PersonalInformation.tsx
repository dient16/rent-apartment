import React, { useState } from 'react';
import {
   Avatar,
   Button,
   DatePicker,
   Input,
   Select,
   Spin,
   message,
   Upload,
} from 'antd';
import {
   UserOutlined,
   EditOutlined,
   CameraOutlined,
   MailOutlined,
   PhoneOutlined,
   CalendarOutlined,
   GlobalOutlined,
   HomeOutlined,
   IdcardOutlined,
   ManOutlined,
   CheckCircleFilled,
   CloseOutlined,
   SaveOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { apiEditUser, apiGetCurrentUser } from '@/apis';
import moment from 'moment';
import dayjs from 'dayjs';
import { RcFile } from 'antd/es/upload';
import type { UploadFile } from 'antd/es/upload/interface';

interface FieldTileProps {
   icon: React.ReactNode;
   label: string;
   value?: React.ReactNode;
}

/** O thong tin che do xem: icon vuong + label in hoa + gia tri */
const FieldTile: React.FC<FieldTileProps> = ({ icon, label, value }) => (
   <div className="flex gap-4 items-start">
      <span className="flex flex-shrink-0 justify-center items-center w-11 h-11 text-lg text-gray-500 bg-gray-100 rounded-xl">
         {icon}
      </span>
      <div className="min-w-0">
         <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
            {label}
         </p>
         <p className="mt-1 text-sm font-semibold text-gray-900 break-words">
            {value || <span className="font-normal text-gray-400">—</span>}
         </p>
      </div>
   </div>
);

const inputClass = 'h-10 rounded-lg';

const PersonalInformation: React.FC = () => {
   const [isEditing, setIsEditing] = useState<boolean>(false);
   const queryClient = useQueryClient();
   const editProfileMutator = useMutation({
      mutationFn: apiEditUser,
   });
   const {
      handleSubmit,
      control,
      reset,
      formState: { errors },
      getValues,
   } = useForm();
   const { data, isLoading } = useQuery({
      queryKey: ['userProfile'],
      queryFn: apiGetCurrentUser,
   });

   const handleEditUser = (
      data: Record<string, UploadFile | string | undefined>,
   ) => {
      const formData = new FormData();
      if (Array.isArray(data?.avatarEdit) && data.avatarEdit.length > 0) {
         delete (data as Record<string, string>).avatar;
      }
      Object.entries(data).forEach(
         ([key, value]: [string, UploadFile | string | undefined]) => {
            if (key === 'avatarEdit' && value) {
               const files: UploadFile[] = Array.isArray(value)
                  ? value
                  : [value as UploadFile];
               const fileToAppend =
                  files.length > 0
                     ? (files[0].originFileObj as File)
                     : undefined;
               if (fileToAppend) {
                  formData.append('avatar', fileToAppend);
               }
            } else if (value != null) {
               formData.append(key, value as string);
            }
         },
      );

      editProfileMutator.mutate(formData, {
         onSuccess: (response: Res) => {
            if (response.success) {
               message.success('Profile updated successfully');
               setIsEditing(false);
               queryClient.invalidateQueries({ queryKey: ['userProfile'] });
               queryClient.invalidateQueries({ queryKey: ['currentUser'] });
               reset();
            }
         },
         onError: () => {
            message.error('Edit profile failed');
         },
      });
   };

   const getBase64 = (file: RcFile): Promise<string> =>
      new Promise((resolve, reject) => {
         const reader = new FileReader();
         reader.readAsDataURL(file);
         reader.onload = () => resolve(reader.result as string);
         reader.onerror = (error) => reject(error);
      });

   const user = data?.data;
   const fullName =
      [user?.firstname, user?.lastname].filter(Boolean).join(' ') || 'Guest';
   const memberSince = user?.createdAt
      ? moment(user.createdAt).format('MMM YYYY')
      : 'N/A';

   /** Cau hinh field de render dong nhat o ca 2 che do */
   const editableFields = [
      {
         name: 'firstname',
         label: 'First name',
         rules: { required: 'First name is required' },
      },
      {
         name: 'lastname',
         label: 'Last name',
         rules: { required: 'Last name is required' },
      },
      {
         name: 'email',
         label: 'Email address',
         rules: {
            required: 'Email is required',
            pattern: {
               value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
               message: 'Invalid email address',
            },
         },
      },
      {
         name: 'phone',
         label: 'Phone number',
         rules: {
            required: 'Phone is required',
            pattern: { value: /^0\d{9}$/, message: 'Invalid phone number' },
         },
      },
      { name: 'nationality', label: 'Nationality', rules: {} },
      { name: 'address', label: 'Address', rules: {} },
      { name: 'personalId', label: 'Personal ID', rules: {} },
   ];

   return (
      <>
         <Spin
            spinning={isLoading || editProfileMutator.isPending}
            fullscreen
            size="large"
         />
         <div className="pb-10 w-full font-main">
            <form onSubmit={handleSubmit(handleEditUser)} className="w-full">
               <div className="overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-card-sm">
                  {/* ===== Header ===== */}
                  <div className="flex flex-wrap gap-5 justify-between items-center p-6 border-b border-gray-100 md:p-8">
                     <div className="flex gap-5 items-center min-w-0">
                        <div className="relative flex-shrink-0">
                           {isEditing ? (
                              <Controller
                                 control={control}
                                 name="avatarEdit"
                                 render={({ field: { onChange, value } }) => (
                                    <Upload
                                       listType="picture-circle"
                                       className="avatar-uploader"
                                       accept="image/*"
                                       showUploadList={false}
                                       customRequest={() => {}}
                                       fileList={
                                          typeof value === 'string'
                                             ? null
                                             : value
                                       }
                                       onChange={({ fileList }) => {
                                          (async () => {
                                             fileList[0].thumbUrl =
                                                await getBase64(
                                                   fileList[0]
                                                      .originFileObj as RcFile,
                                                );
                                             onChange(fileList);
                                          })();
                                       }}
                                       maxCount={1}
                                    >
                                       <div className="relative cursor-pointer group">
                                          <Avatar
                                             size={84}
                                             src={
                                                getValues('avatarEdit')?.[0]
                                                   ?.thumbUrl || user?.avatar
                                             }
                                             icon={<UserOutlined />}
                                          />
                                          <span className="flex absolute inset-0 justify-center items-center text-white rounded-full opacity-0 transition-opacity bg-black/40 group-hover:opacity-100">
                                             <CameraOutlined className="text-xl" />
                                          </span>
                                       </div>
                                    </Upload>
                                 )}
                              />
                           ) : (
                              <>
                                 <Avatar
                                    size={84}
                                    src={user?.avatar}
                                    icon={<UserOutlined />}
                                    className="border-2 border-white shadow-card-sm"
                                 />
                                 <CheckCircleFilled className="absolute right-0.5 bottom-0.5 text-lg text-green-500 bg-white rounded-full" />
                              </>
                           )}
                        </div>
                        <div className="min-w-0">
                           <div className="flex flex-wrap gap-2 items-center">
                              <h1 className="text-2xl font-bold text-gray-900 truncate">
                                 {fullName}
                              </h1>
                              <span className="px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-blue-600 uppercase bg-blue-50 rounded-md">
                                 Member
                              </span>
                           </div>
                           <p className="mt-1 text-sm text-gray-500 truncate">
                              Member since {memberSince} · {user?.email}
                           </p>
                        </div>
                     </div>

                     {!isEditing ? (
                        <Button
                           type="primary"
                           size="large"
                           icon={<EditOutlined />}
                           className="h-10 bg-blue-500 rounded-lg"
                           onClick={() => setIsEditing(true)}
                        >
                           Edit Profile
                        </Button>
                     ) : (
                        <div className="flex gap-3">
                           <Button
                              size="large"
                              icon={<CloseOutlined />}
                              className="h-10 rounded-lg"
                              onClick={() => {
                                 setIsEditing(false);
                                 reset();
                              }}
                           >
                              Cancel
                           </Button>
                           <Button
                              type="primary"
                              size="large"
                              htmlType="submit"
                              icon={<SaveOutlined />}
                              loading={editProfileMutator.isPending}
                              className="h-10 bg-blue-500 rounded-lg"
                           >
                              Save changes
                           </Button>
                        </div>
                     )}
                  </div>

                  {/* ===== Body ===== */}
                  <div className="p-6 md:p-8">
                     <h2 className="text-lg font-bold text-gray-900">
                        Personal Information
                     </h2>
                     <p className="mt-0.5 mb-7 text-sm text-gray-500">
                        Your account and contact details.
                     </p>

                     {!isEditing ? (
                        <div className="grid gap-x-10 gap-y-7 md:grid-cols-2">
                           <FieldTile
                              icon={<UserOutlined />}
                              label="Name"
                              value={fullName}
                           />
                           <FieldTile
                              icon={<MailOutlined />}
                              label="Email address"
                              value={user?.email}
                           />
                           <FieldTile
                              icon={<PhoneOutlined />}
                              label="Phone number"
                              value={user?.phone}
                           />
                           <FieldTile
                              icon={<CalendarOutlined />}
                              label="Date of birth"
                              value={
                                 user?.dateOfBirth
                                    ? moment(user.dateOfBirth).format(
                                         'DD MMM YYYY',
                                      )
                                    : undefined
                              }
                           />
                           <FieldTile
                              icon={<ManOutlined />}
                              label="Gender"
                              value={user?.gender}
                           />
                           <FieldTile
                              icon={<GlobalOutlined />}
                              label="Nationality"
                              value={user?.nationality}
                           />
                           <FieldTile
                              icon={<HomeOutlined />}
                              label="Address"
                              value={user?.address}
                           />
                           <FieldTile
                              icon={<IdcardOutlined />}
                              label="Personal ID"
                              value={user?.personalId}
                           />
                        </div>
                     ) : (
                        <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
                           {editableFields.map((fieldConfig) => (
                              <Controller
                                 key={fieldConfig.name}
                                 control={control}
                                 name={fieldConfig.name}
                                 defaultValue={user?.[fieldConfig.name]}
                                 rules={fieldConfig.rules}
                                 render={({ field }) => (
                                    <div className="flex flex-col gap-1.5">
                                       <label className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                          {fieldConfig.label}
                                       </label>
                                       <Input
                                          {...field}
                                          className={inputClass}
                                          status={
                                             errors?.[fieldConfig.name] &&
                                             'error'
                                          }
                                       />
                                       {errors?.[fieldConfig.name] && (
                                          <span className="text-xs text-red-600">
                                             {
                                                errors[fieldConfig.name]
                                                   ?.message as string
                                             }
                                          </span>
                                       )}
                                    </div>
                                 )}
                              />
                           ))}

                           <Controller
                              control={control}
                              name="dateOfBirth"
                              defaultValue={
                                 user?.dateOfBirth
                                    ? dayjs(user.dateOfBirth)
                                    : undefined
                              }
                              render={({ field }) => (
                                 <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                       Date of birth
                                    </label>
                                    <DatePicker
                                       {...field}
                                       format="DD/MM/YYYY"
                                       className={`w-full ${inputClass}`}
                                    />
                                 </div>
                              )}
                           />

                           <Controller
                              control={control}
                              name="gender"
                              defaultValue={user?.gender}
                              render={({ field }) => (
                                 <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                                       Gender
                                    </label>
                                    <Select
                                       {...field}
                                       className="h-10"
                                       placeholder="Select gender"
                                       options={[
                                          { value: 'Male', label: 'Male' },
                                          { value: 'Female', label: 'Female' },
                                          { value: 'Other', label: 'Other' },
                                       ]}
                                    />
                                 </div>
                              )}
                           />
                        </div>
                     )}
                  </div>
               </div>
            </form>
         </div>
      </>
   );
};

export default PersonalInformation;
