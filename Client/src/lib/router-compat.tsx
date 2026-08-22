'use client';

/**
 * react-router-dom compatibility layer over next/navigation.
 * Components keep their old API (useNavigate, Link to=, NavLink,
 * tuple-style useSearchParams...) — only the import source changed.
 */
import React, { useEffect, useMemo } from 'react';
import NextLink from 'next/link';
import {
   usePathname,
   useRouter,
   useParams as useNextParams,
   useSearchParams as useNextSearchParams,
} from 'next/navigation';

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
         router.push(to);
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

export const useSearchParams = (): [URLSearchParams, SetSearchParams] => {
   const router = useRouter();
   const pathname = usePathname();
   const nextParams = useNextSearchParams();

   const params = useMemo(
      () => new URLSearchParams(nextParams?.toString() || ''),
      [nextParams],
   );

   const setSearchParams: SetSearchParams = (next) => {
      const qs =
         next instanceof URLSearchParams
            ? next.toString()
            : new URLSearchParams(next).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname || '/');
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
   <NextLink href={to} {...rest}>
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
         href={to}
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
      router.replace(to);
   }, [router, to]);
   return null;
};
