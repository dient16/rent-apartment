import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * `false` while rendering on the server and during the first client render,
 * `true` afterwards — so browser-only state (localStorage, window) can be read
 * without the first client render diverging from the server HTML.
 */
const useIsHydrated = (): boolean =>
   useSyncExternalStore(
      subscribe,
      () => true,
      () => false,
   );

export default useIsHydrated;
