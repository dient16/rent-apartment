'use client';

import React from 'react';
import { Spin } from 'antd';
import { useLockBodyScroll } from '@/hooks';

interface FullscreenLoaderProps {
   spinning: boolean;
   children?: React.ReactNode;
}

/** antd's `Spin fullscreen` leaves the page scrollable, so pair it with a scroll lock. */
const FullscreenLoader: React.FC<FullscreenLoaderProps> = ({
   spinning,
   children,
}) => {
   useLockBodyScroll(spinning);

   if (children === undefined) {
      // A childless <Spin spinning={false}> still renders an in-flow .ant-spin box,
      // which pushed the page content down (e.g. the settings panel vs its sidebar).
      return spinning ? <Spin spinning fullscreen size="large" /> : null;
   }

   return (
      <Spin spinning={spinning} fullscreen={spinning} size="large">
         {children}
      </Spin>
   );
};

export default FullscreenLoader;
