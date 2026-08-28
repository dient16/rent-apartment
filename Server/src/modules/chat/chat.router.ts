/**
 * /api/chat - standalone chat. Deliberately NOT registered in the OpenAPI document.
 * Every route needs a bearer token except the signed image URL (HMAC + expiry).
 */
import express from 'express';
import multer from 'multer';

import { verifyAccessToken } from '@/middlewares/verifyToken';
import { validateRequest } from '@/utils/httpHandlers';

import * as controller from './chat.controller';
import {
  addMembersSchema,
  createDirectSchema,
  createGroupSchema,
  listMessagesSchema,
  memberParamsSchema,
  messageParamsSchema,
  reactSchema,
  renameGroupSchema,
  searchStickersSchema,
  searchUsersSchema,
  sendMessageSchema,
  sendStickerSchema,
  setRoleSchema,
} from './chat.dto';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Memory storage: the bytes are encrypted before they are written to the chat database.
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)),
});

const router = express.Router();

router.get('/images/:fileId', controller.readImage);

router.use(verifyAccessToken);

router.get('/rooms', controller.listRooms);
router.post('/rooms/direct', validateRequest(createDirectSchema), controller.createDirect);
router.post('/rooms/group', validateRequest(createGroupSchema), controller.createGroup);
router.get('/rooms/:roomId', controller.getRoom);
router.patch('/rooms/:roomId', validateRequest(renameGroupSchema), controller.renameGroup);
router.post('/rooms/:roomId/members', validateRequest(addMembersSchema), controller.addMembers);
router.patch('/rooms/:roomId/members/:userId', validateRequest(setRoleSchema), controller.setMemberRole);
router.delete('/rooms/:roomId/members/:userId', validateRequest(memberParamsSchema), controller.removeMember);
router.get('/rooms/:roomId/messages', validateRequest(listMessagesSchema), controller.listMessages);
router.post('/rooms/:roomId/messages', validateRequest(sendMessageSchema), controller.sendText);
router.post('/rooms/:roomId/stickers', validateRequest(sendStickerSchema), controller.sendSticker);
router.post('/rooms/:roomId/images', imageUpload.single('image'), controller.sendImage);
router.post('/rooms/:roomId/read', controller.markRead);
router.post('/messages/:messageId/recall', validateRequest(messageParamsSchema), controller.recallMessage);
router.post('/messages/:messageId/react', validateRequest(reactSchema), controller.reactMessage);
router.get('/users', validateRequest(searchUsersSchema), controller.searchUsers);
router.get('/stickers/search', validateRequest(searchStickersSchema), controller.searchStickers);

export const chatRouter = router;
