import moment from 'moment';

import { env } from '@/config/env.config';

/** Readable dates for emails. */
export const formatMailDate = (value: Date | string) => moment(value).format('ddd, DD MMM YYYY');

export const bookingUrl = (bookingId: string) => `${env.CLIENT_URL}/my-booking/${bookingId}`;

export type BookingListQuery = { page?: number; limit?: number; status?: string; search?: string };
