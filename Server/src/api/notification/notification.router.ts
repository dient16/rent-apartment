import express from 'express';

import * as controller from '@/api/notification/notification.controller';
import { verifyAccessToken } from '@/middlewares/verifyToken';

const router = express.Router();

router.get('/', verifyAccessToken, controller.getNotifications);
router.post('/read-all', verifyAccessToken, controller.markAllAsRead);
router.post('/:notificationId/read', verifyAccessToken, controller.markAsRead);

export const notificationRouter = router;
