import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { EnvironmentOutlined } from '@ant-design/icons';
import { FiMapPin } from 'react-icons/fi';
import { useDebounce } from '@/hooks';
import { apiSuggestAddress, type AddressSuggestion } from '@/apis/location.api';

interface AutoCompleteAddressProps {
   value: string;
   onChange: (value: string) => void;
   setValue: (name: string, value: unknown) => void;
   /** Render the list in flow (for the mobile full-screen sheet) instead of an absolute popup */
   inline?: boolean;
   onSelect?: () => void;
   open?: boolean;
   matchWidth?: boolean;
}

/** Address suggestions — served by the BE (/api/location/suggest, cached) */
const AutoCompleteAddress: React.FC<AutoCompleteAddressProps> = ({
   value,
   onChange,
   setValue,
   inline = false,
   onSelect,
   open,
   matchWidth = false,
}) => {
   const [selected, setSelected] = React.useState<string | null>(null);
   const debouncedSearchValue = useDebounce(value, 400);

   const { data, isFetching } = useQuery({
      queryKey: ['address-suggest', debouncedSearchValue],
      queryFn: () => apiSuggestAddress(debouncedSearchValue),
      enabled:
         !!debouncedSearchValue &&
         debouncedSearchValue.length >= 2 &&
         debouncedSearchValue !== selected,
      staleTime: 10 * 60 * 1000,
   });

   const options: AddressSuggestion[] =
      debouncedSearchValue === selected ? [] : data?.data || [];

   const handleSelect = (suggestion: AddressSuggestion) => {
      setSelected(suggestion.value);
      setValue('searchText', suggestion.value);
      // A geocoder place is searched "near here" (lat/lng); a unit by name.
      setValue(
         'searchPlace',
         suggestion.kind === 'place' && suggestion.lat != null && suggestion.lon != null
            ? { label: suggestion.label, lat: suggestion.lat, lon: suggestion.lon }
            : null,
      );
      onChange(suggestion.value);
      onSelect?.();
   };

   const hasContent = (options.length > 0 || isFetching) && !!value;
   const isOpen = open === undefined ? hasContent : open && hasContent;
   const centred = !inline && !matchWidth;

   return (
      <div className="relative w-full">
         <AnimatePresence>
            {isOpen && (
               <motion.div
                  // The x shift lives here, not in a class: framer-motion overwrites `transform`.
                  initial={{ opacity: 0, y: -6, ...(centred ? { x: '-50%' } : {}) }}
                  animate={{ opacity: 1, y: 0, ...(centred ? { x: '-50%' } : {}) }}
                  exit={{ opacity: 0, y: -6, ...(centred ? { x: '-50%' } : {}) }}
                  transition={{ duration: 0.15 }}
                  className={clsx(
                     inline
                        ? 'overflow-y-auto py-2 w-full'
                        : 'overflow-hidden absolute top-2 z-40 py-2 w-full bg-white rounded-2xl border border-gray-100 shadow-card-md',
                     centred && 'left-1/2 min-w-[320px]',
                     !inline && matchWidth && 'left-0',
                  )}
               >
                  {isFetching ? (
                     <div className="animate-pulse">
                        {[0, 1, 2].map((row) => (
                           <div key={row} className="flex gap-3 items-center px-4 py-2.5">
                              <span className="flex-shrink-0 w-9 h-9 bg-gray-100 rounded-xl" />
                              <span className="flex-1 min-w-0">
                                 <span
                                    className="block h-3 bg-gray-100 rounded"
                                    style={{ width: `${70 - row * 12}%` }}
                                 />
                                 <span
                                    className="block mt-1.5 h-2.5 bg-gray-50 rounded"
                                    style={{ width: `${45 - row * 8}%` }}
                                 />
                              </span>
                           </div>
                        ))}
                     </div>
                  ) : (
                     options.map((suggestion, index) => (
                        <button
                           key={`${suggestion.value}-${index}`}
                           type="button"
                           // Keep focus on the input: a blur would close the popup
                           // before the click could land.
                           onMouseDown={(event) => event.preventDefault()}
                           onClick={() => handleSelect(suggestion)}
                           className="flex gap-3 items-center px-4 py-2.5 w-full text-left bg-transparent border-none transition-colors cursor-pointer hover:bg-gray-50"
                        >
                           <span
                              className={clsx(
                                 'flex flex-shrink-0 justify-center items-center w-9 h-9 rounded-xl',
                                 suggestion.kind === 'place'
                                    ? 'text-rose-500 bg-rose-50'
                                    : 'text-blue-500 bg-blue-50',
                              )}
                           >
                              {suggestion.kind === 'place' ? <FiMapPin size={16} /> : <EnvironmentOutlined />}
                           </span>
                           <span className="min-w-0">
                              <span className="block text-sm font-semibold text-gray-900 truncate">
                                 {suggestion.label}
                              </span>
                              {suggestion.description && (
                                 <span className="block text-xs text-gray-400 truncate">
                                    {suggestion.description}
                                 </span>
                              )}
                           </span>
                        </button>
                     ))
                  )}
               </motion.div>
            )}
         </AnimatePresence>
      </div>
   );
};

export default AutoCompleteAddress;
