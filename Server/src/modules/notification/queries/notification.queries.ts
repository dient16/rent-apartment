import to from 'await-to-js';
import { StatusCodes } from 'http-status-codes';

import { ResponseStatus, ServiceResponse } from '@/utils/serviceResponse';

import { notificationRepository } from '../notification.repository';

/** Read side: paginated notification feed with unread badge count. */
export const notificationQueries = {
  async getNotifications(userId: string, filter: 'all' | 'unread' | 'read', page: number, limit: number) {
    const query: Record<string, unknown> = { user: userId };
    if (filter === 'unread') query.isRead = false;
    if (filter === 'read') query.isRead = true;

    const [err, result] = await to(notificationRepository.findPage(query, userId, page, limit));
    if (err) {
      return new ServiceResponse(
        ResponseStatus.Failed,
        'Error fetching notifications',
        null,
        StatusCodes.INTERNAL_SERVER_ERROR
      );
    }

    const [notifications, total, unreadCount] = result;
    return new ServiceResponse(
      ResponseStatus.Success,
      'Notifications retrieved successfully',
      { notifications, total, unreadCount, page },
      StatusCodes.OK
    );
  },
};
