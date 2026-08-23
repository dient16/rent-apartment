import { Image, Drawer, Carousel } from 'antd';
import { MdOutlineGridView } from 'react-icons/md';
import { useState } from 'react';

interface ImageGalleryProps {
   images: string[];
}

const COVER = { width: '100%', height: '100%', objectFit: 'cover' as const };

const ImageGallery: React.FC<ImageGalleryProps> = ({ images }) => {
   const [drawerVisible, setDrawerVisible] = useState(false);
   const extraCount = images.length - 5;

   return (
      <>
         {/* Desktop: Airbnb-style mosaic — one seamless rounded block */}
         <div className="hidden relative lg:block mt-8">
            <Image.PreviewGroup>
               <div className="grid overflow-hidden grid-cols-4 grid-rows-2 gap-2 w-full rounded-3xl h-[440px]">
                  <div className="overflow-hidden col-span-2 row-span-2 h-full">
                     <Image
                        src={images[0]}
                        alt="Main photo"
                        rootClassName="block! w-full h-full"
                        style={COVER}
                     />
                  </div>
                  {images.slice(1, 5).map((image, index) => (
                     <div key={index} className="overflow-hidden h-full">
                        <Image
                           src={image}
                           alt={`Photo ${index + 2}`}
                           rootClassName="block! w-full h-full"
                           style={COVER}
                           preview={
                              index === 3 && extraCount > 0
                                 ? { cover: <span className="text-base font-semibold">+{extraCount} photos</span> }
                                 : undefined
                           }
                        />
                     </div>
                  ))}
               </div>
            </Image.PreviewGroup>
            <button
               type="button"
               onClick={() => setDrawerVisible(true)}
               className="flex absolute right-4 bottom-4 gap-2 items-center px-4 h-10 text-sm font-semibold text-gray-800 bg-white rounded-full border border-gray-200 shadow-md transition-all cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
            >
               <MdOutlineGridView size={17} />
               Show all {images.length} photos
            </button>
         </div>

         {/* Mobile: swipeable carousel */}
         <div className="lg:hidden mt-6">
            <div className="overflow-hidden relative rounded-2xl">
               <Carousel arrows swipeToSlide draggable>
                  {images.map((image, index) => (
                     <div key={index} className="w-full h-[220px] sm:h-[280px] md:h-[380px]">
                        <img src={image} alt={`Photo ${index + 1}`} style={COVER} />
                     </div>
                  ))}
               </Carousel>
               <button
                  type="button"
                  onClick={() => setDrawerVisible(true)}
                  className="flex absolute right-3 bottom-3 gap-1.5 items-center px-3 h-8 text-xs font-semibold text-gray-800 bg-white/95 rounded-full border-none shadow cursor-pointer"
               >
                  <MdOutlineGridView size={14} />
                  {images.length} photos
               </button>
            </div>
         </div>

         {/* All photos */}
         <Drawer
            title={
               <span className="text-lg font-semibold">
                  All photos{' '}
                  <span className="text-sm font-normal text-gray-400">
                     ({images.length})
                  </span>
               </span>
            }
            placement="bottom"
            onClose={() => setDrawerVisible(false)}
            open={drawerVisible}
            size="100%"
            styles={{ body: { background: '#fff' } }}
         >
            <div className="mx-auto max-w-6xl">
               <Image.PreviewGroup>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                     {images.map((image, index) => (
                        <div
                           key={index}
                           className="overflow-hidden rounded-2xl h-[240px] md:h-[280px]"
                        >
                           <Image
                              src={image}
                              alt={`Photo ${index + 1}`}
                              rootClassName="block! w-full h-full"
                              style={COVER}
                           />
                        </div>
                     ))}
                  </div>
               </Image.PreviewGroup>
            </div>
         </Drawer>
      </>
   );
};

export default ImageGallery;
