import type { AxiosError } from 'axios';

/** Message from the API error envelope, or `fallback` when the failure had no body. */
export const getApiErrorMessage = (error: unknown, fallback: string): string => {
   const data = (error as AxiosError<{ message?: string }> | undefined)?.response
      ?.data;
   return data?.message || fallback;
};
