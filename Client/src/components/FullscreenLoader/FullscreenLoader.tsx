'use client';

import React from 'react';
import { Spin } from 'antd';
import { useLockBodyScroll } from '@/hooks';

interface FullscreenLoaderProps {
   spinning: boolean;
   children?: React.ReactNode;
}

/**
 * antd's `Spin fullscreen` paints an overlay but — unlike Modal/Drawer — leaves the
 * page scrollable behind it. This pairs the spinner with a body scroll lock so the
 * page actually stays put while something is loading.
 */
const FullscreenLoader: React.FC<FullscreenLoaderProps> = ({
   spinning,
   children,
}) => {
   useLockBodyScroll(spinning);

   if (children === undefined) {
      return <Spin spinning={spinning} fullscreen={spinning} size="large" />;
   }

   return (
      <Spin spinning={spinning} fullscreen={spinning} size="large">
         {children}
      </Spin>
   );
};

export default FullscreenLoader;
