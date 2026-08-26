import { useEffect, useState } from 'react';
import type { FC } from 'react';
import clsx from 'clsx';

// Same order as the sections on the detail page. "Overview" is the amenities + description
// block, so it does not get its own tab.
const tabs = [
   { name: 'Overview', key: 'overview' },
   { name: 'Rooms', key: 'rooms' },
   { name: 'Location', key: 'location' },
   { name: 'Policies', key: 'policies' },
   { name: 'Reviews', key: 'reviews' },
];

// Header (80px) + sticky date bar (52px) on lg screens: the tab bar sits right under them.
const STICKY_TOP = 132;
// Where a section's top should land after a click: under the sticky bars + this tab bar.
const SCROLL_OFFSET = STICKY_TOP + 56;

const NavigationBarRoom: FC = () => {
   const [activeTab, setActiveTab] = useState<string>(tabs[0].key);

   useEffect(() => {
      let frame = 0;
      const update = () => {
         frame = 0;
         // Active = the last section whose top has scrolled past the tab bar.
         let current = tabs[0].key;
         for (const tab of tabs) {
            const element = document.getElementById(tab.key);
            if (!element) continue;
            if (element.getBoundingClientRect().top - SCROLL_OFFSET <= 8) current = tab.key;
         }
         // At the very bottom the last section may be too short to pass the bar.
         if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
            current = tabs[tabs.length - 1].key;
         }
         setActiveTab(current);
      };
      const onScroll = () => {
         if (!frame) frame = window.requestAnimationFrame(update);
      };
      update();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      return () => {
         window.removeEventListener('scroll', onScroll);
         window.removeEventListener('resize', onScroll);
         if (frame) window.cancelAnimationFrame(frame);
      };
   }, []);

   const handleTabClick = (key: string) => {
      const element = document.getElementById(key);
      if (!element) return;
      setActiveTab(key);
      window.scrollTo({
         top: element.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET + 8,
         behavior: 'smooth',
      });
   };

   return (
      <nav
         aria-label="Sections"
         className="hidden sticky z-30 -mx-1 px-1 bg-white/95 backdrop-blur border-b border-gray-200 lg:block"
         style={{ top: STICKY_TOP }}
      >
         <div className="flex gap-7">
            {tabs.map((tab) => (
               <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabClick(tab.key)}
                  aria-current={activeTab === tab.key ? 'true' : undefined}
                  className={clsx(
                     'relative py-3.5 text-sm font-medium bg-transparent border-none cursor-pointer transition-colors',
                     activeTab === tab.key
                        ? 'text-blue-600'
                        : 'text-gray-500 hover:text-gray-900',
                  )}
               >
                  {tab.name}
                  <span
                     className={clsx(
                        'absolute right-0 -bottom-px left-0 h-0.5 rounded-full bg-blue-600 transition-transform duration-200 origin-left',
                        activeTab === tab.key ? 'scale-x-100' : 'scale-x-0',
                     )}
                  />
               </button>
            ))}
         </div>
      </nav>
   );
};

export default NavigationBarRoom;
