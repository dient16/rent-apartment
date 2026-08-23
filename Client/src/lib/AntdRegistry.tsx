'use client';

import React from 'react';
import { AntdRegistry as OfficialAntdRegistry } from '@ant-design/nextjs-registry';

/**
 * Streams antd CSS-in-JS styles into the SSR HTML so the first paint is
 * already styled (no flash of unstyled antd components on hard refresh).
 * `layer` scopes antd styles to the `antd` cascade layer (declared in
 * globals.css) so Tailwind utility classes keep precedence over them.
 */
const AntdRegistry: React.FC<{ children: React.ReactNode }> = ({ children }) => (
   <OfficialAntdRegistry layer>{children}</OfficialAntdRegistry>
);

export default AntdRegistry;
