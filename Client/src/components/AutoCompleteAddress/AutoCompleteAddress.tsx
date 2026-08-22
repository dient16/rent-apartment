import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Spin } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { useDebounce } from '@/hooks';
import { apiSuggestAddress, type AddressSuggestion } from '@/apis/location.api';

interface AutoCompleteAddressProps {
   value: string;
   onChange: (value: string) => void;
   setValue: (name: string, value: string) => void;
   /** Render the list in flow (for the mobile full-screen sheet) instead of an absolute popup */
   inline?: boolean;
   onSelect?: () => void;
}

/** Address suggestions — served by the BE (/api/location/suggest, cached) */
const AutoCompleteAddress: React.FC<AutoCompleteAddressProps> = ({
   value,
   onChange,
   setValue,
   inline = false,
   onSelect,
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
      onChange(suggestion.value);
      onSelect?.();
   };

   const isOpen = (options.length > 0 || isFetching) && !!value;

   return (
      <div className="relative w-full">
         <AnimatePresence>
            {isOpen && (
               <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className={
                     inline
                        ? 'overflow-y-auto py-2 w-full'
                        : 'overflow-hidden absolute left-0 top-3 z-20 py-2 w-full bg-white rounded-2xl border border-gray-100 shadow-card-md min-w-[320px]'
                  }
               >
                  {isFetching ? (
                     <div className="flex gap-2 justify-center items-center py-5 text-sm text-gray-400">
                        <Spin size="small" /> Searching places...
                     </div>
                  ) : (
                     options.map((suggestion, index) => (
                        <button
                           key={`${suggestion.value}-${index}`}
                           type="button"
                           onClick={() => handleSelect(suggestion)}
                           className="flex gap-3 items-center px-4 py-2.5 w-full text-left bg-transparent border-none transition-colors cursor-pointer hover:bg-gray-50"
                        >
                           <span className="flex flex-shrink-0 justify-center items-center w-9 h-9 text-blue-500 bg-blue-50 rounded-xl">
                              <EnvironmentOutlined />
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
