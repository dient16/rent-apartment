'use client';

/**
 * react-router-dom compatibility layer over next/navigation.
 * Components keep their old API (useNavigate, Link to=, NavLink,
 * tuple-style useSearchParams...) — only the import source changed.
 */
import React, { useEffect, useMemo, useReducer } from 'react';
import NextLink from 'next/link';
import {
   usePathname,
   useRouter,
   useParams as useNextParams,
   useSearchParams as useNextSearchParams,
} from 'next/navigation';

/** The old react-router routes resolved bare paths ("listing") from the root —
 * keep that behavior: every non-external path is treated as absolute. */
const absolutize = (to: string) =>
   to.startsWith('/') || /^[a-z]+:/i.test(to) ? to : `/${to}`;

/* ===================== useNavigate ===================== */
export const useNavigate = () => {
   const router = useRouter();
   return useMemo(
      () => (to: string | number) => {
         if (typeof to === 'number') {
            if (to < 0) router.back();
            else router.forward();
            return;
         }
         router.push(absolutize(to));
      },
      [router],
   );
};

/* ===================== useParams ===================== */
export const useParams = <
   T extends Record<string, string | undefined> = Record<string, string>,
>(): T => {
   return (useNextParams() || {}) as T;
};

/* ===================== useLocation ===================== */
export const useLocation = () => {
   const pathname = usePathname();
   const searchParams = useNextSearchParams();
   const search = searchParams?.toString();
   return useMemo(
      () => ({ pathname: pathname || '/', search: search ? `?${search}` : '' }),
      [pathname, search],
   );
};

/* ===================== useSearchParams (tuple API) ===================== */
type SetSearchParams = (
   next: URLSearchParams | Record<string, string>,
) => void;

// Shallow URL updates bypass the Next router, so notify every subscribed
// useSearchParams() ourselves — both directions (chips <-> URL) stay in sync.
const searchParamListeners = new Set<() => void>();
const notifySearchParams = () => searchParamListeners.forEach((listener) => listener());

export const useSearchParams = (): [URLSearchParams, SetSearchParams] => {
   const router = useRouter();
   const pathname = usePathname();
   const nextParams = useNextSearchParams();
   const [version, bump] = useReducer((count: number) => count + 1, 0);

   useEffect(() => {
      searchParamListeners.add(bump);
      window.addEventListener('popstate', bump);
      return () => {
         searchParamListeners.delete(bump);
         window.removeEventListener('popstate', bump);
      };
   }, []);

   const params = useMemo(
      () =>
         new URLSearchParams(
            typeof window !== 'undefined'
               ? window.location.search
               : nextParams?.toString() || '',
         ),
      // `version` re-reads the live URL after a shallow replaceState
      [nextParams, version],
   );

   const setSearchParams: SetSearchParams = (next) => {
      const qs =
         next instanceof URLSearchParams
            ? next.toString()
            : new URLSearchParams(next).toString();
      const url = qs ? `${pathname}?${qs}` : pathname || '/';
      // Shallow update: no server round trip re-running the (force-dynamic) page.
      if (typeof window !== 'undefined') {
         window.history.replaceState(window.history.state, '', url);
         notifySearchParams();
      } else {
         router.replace(url);
      }
   };

   return [params, setSearchParams];
};

/* ===================== Link / NavLink ===================== */
interface LinkProps
   extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
   to: string;
   children?: React.ReactNode;
}

export const Link: React.FC<LinkProps> = ({ to, children, ...rest }) => (
   <NextLink href={absolutize(to)} {...rest}>
      {children}
   </NextLink>
);

interface NavLinkProps
   extends Omit<
      React.AnchorHTMLAttributes<HTMLAnchorElement>,
      'href' | 'className' | 'children'
   > {
   to: string;
   end?: boolean;
   className?: string | ((state: { isActive: boolean }) => string);
   children?:
      | React.ReactNode
      | ((state: { isActive: boolean }) => React.ReactNode);
}

export const NavLink: React.FC<NavLinkProps> = ({
   to,
   end,
   className,
   children,
   ...rest
}) => {
   const pathname = usePathname() || '/';
   const target = to.split('?')[0] || '/';
   const normalized = (value: string) =>
      value !== '/' && value.endsWith('/') ? value.slice(0, -1) : value;
   const current = normalized(pathname);
   const dest = normalized(
      target.startsWith('/') ? target : `/${target}`,
   );
   const isActive = end
      ? current === dest
      : current === dest || current.startsWith(`${dest}/`);

   return (
      <NextLink
         href={absolutize(to)}
         className={
            typeof className === 'function' ? className({ isActive }) : className
         }
         {...rest}
      >
         {typeof children === 'function' ? children({ isActive }) : children}
      </NextLink>
   );
};

/* ===================== Navigate (redirect component) ===================== */
export const Navigate: React.FC<{ to: string; replace?: boolean }> = ({
   to,
}) => {
   const router = useRouter();
   useEffect(() => {
      router.replace(absolutize(to));
   }, [router, to]);
   return null;
};
