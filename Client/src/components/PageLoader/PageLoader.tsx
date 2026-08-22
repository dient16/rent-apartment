import React from 'react';
import { Spin } from 'antd';

/** Fallback shown while a lazy page chunk is loading — keeps layout height stable. */
const PageLoader: React.FC = () => (
   <div className="flex min-h-[60vh] w-full items-center justify-center">
      <Spin size="large" />
   </div>
);

export default PageLoader;
