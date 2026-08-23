import React, { useState } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Upload, message, Spin, Image, UploadFile } from 'antd';
import type { RcFile, UploadProps } from 'antd/es/upload';

// antd 6 no longer hoists rc-upload — derive the request option type from UploadProps
type UploadRequestOption = Parameters<NonNullable<UploadProps['customRequest']>>[0];
import { apiUploadImage, apiDeleteImage } from '@/apis';
import { BiTrash } from 'react-icons/bi';
import { AxiosProgressEvent } from 'axios';
import { FiUploadCloud } from 'react-icons/fi';

interface RoomImagesFormProps {
   index: number;
}

const RoomImagesForm: React.FC<RoomImagesFormProps> = ({ index }) => {
   const { control } = useFormContext();
   const [uploading, setUploading] = useState<boolean>(false);

   const uploadImage = async (
      file: RcFile,
      onProgress: (event: { percent: number }) => void,
   ) => {
      const formData = new FormData();
      formData.append('image', file);

      try {
         const response = await apiUploadImage(formData, {
            onUploadProgress: (progressEvent: AxiosProgressEvent) => {
               if (progressEvent.total) {
                  onProgress({
                     percent:
                        (progressEvent.loaded / progressEvent.total) * 100,
                  });
               }
            },
         });

         if (response.success) {
            message.success(`${file.name} file uploaded successfully.`);
            return {
               uid: file.uid,
               name: file.name,
               status: 'done',
               url: response.data,
               response: { url: response.data },
            };
         } else {
            throw new Error('Upload failed');
         }
      } catch (error) {
         message.error(`${file.name} file upload failed.`);
         throw error;
      } finally {
         setUploading(false);
      }
   };

   const customRequest = async ({
      file,
      onSuccess,
      onError,
      onProgress,
   }: UploadRequestOption) => {
      setUploading(true);
      try {
         const uploadedFile = await uploadImage(file as RcFile, onProgress!);
         onSuccess!(uploadedFile);
      } catch (error) {
         onError!(error);
      } finally {
         setUploading(false);
      }
   };

   const handleDelete = async (file: UploadFile) => {
      try {
         const url = file.url || file.response?.url;
         const fileName = url ? url.split('/').pop() : null;
         if (!fileName) throw new Error('File name not found in URL');

         await apiDeleteImage(fileName);
         message.success('Image deleted successfully');
      } catch (error) {
         message.error('Failed to delete image');
      }
   };

   const uploadButton = (
      <div className="flex flex-col items-center font-main">
         <FiUploadCloud className="text-4xl" />
         <div className="mt-2 text-lg">Drag & Drop or Upload</div>
      </div>
   );

   return (
      <div className="mb-6 w-full mx-auto upload-images">
         <label className="block text-lg font-medium text-gray-700">
            Upload Room Images
         </label>
         <p className="text-sm text-gray-600 mb-2">
            Please upload images of the room. You can upload multiple images. To
            delete an image, click on the trash icon.
         </p>
         <Controller
            control={control}
            name={`rooms.${index}.images`}
            rules={{ required: 'At least one image is required' }}
            render={({ field, fieldState: { error } }) => (
               <>
                  <Upload
                     customRequest={customRequest}
                     listType="picture-card"
                     fileList={field.value}
                     onChange={({ fileList }) => {
                        field.onChange(fileList);
                     }}
                     style={{ width: '100%' }}
                     multiple
                     itemRender={(_ReactElement, file, _fileList, actions) => {
                        return (
                           <div className="flex relative justify-center items-center w-full h-full">
                              {uploading && file.status === 'uploading' ? (
                                 <Spin size="large" />
                              ) : (
                                 <div className="rounded-lg overflow-hidden">
                                    <Image
                                       src={
                                          file?.response?.url ?? file.thumbUrl
                                       }
                                       height={300}
                                       width={340}
                                    />
                                 </div>
                              )}
                              <i
                                 className="absolute top-2 right-2 p-1 rounded-full border cursor-pointer bg-white"
                                 onClick={async () => {
                                    await handleDelete(file);
                                    actions.remove();
                                 }}
                              >
                                 <BiTrash color={'#cc0000'} size={24} />
                              </i>
                           </div>
                        );
                     }}
                  >
                     {uploadButton}
                  </Upload>
                  {error && (
                     <p className="text-red-500 mt-2">{error.message}</p>
                  )}
               </>
            )}
         />
      </div>
   );
};

export default RoomImagesForm;
