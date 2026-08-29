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
  linkPreviewSchema,
  listMediaSchema,
  listMessagesSchema,
  memberParamsSchema,
  editMessageSchema,
  messageParamsSchema,
  muteSchema,
  pinMessageSchema,
  reactSchema,
  renameGroupSchema,
  searchUsersSchema,
  sendMessageSchema,
  setRoleSchema,
} from './chat.dto';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Memory storage: the bytes are encrypted before they are written to the chat database.
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  // e2e uploads arrive as application/octet-stream (ciphertext); the real type is a form field
  fileFilter: (_req, file, cb) => cb(null, /^image\/(jpeg|png|gif|webp)$/.test(file.mimetype) || file.mimetype === 'application/octet-stream'),
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
router.post('/rooms/:roomId/images', imageUpload.single('image'), controller.sendImage);
router.get('/rooms/:roomId/media', validateRequest(listMediaSchema), controller.listMedia);
router.post('/rooms/:roomId/avatar', imageUpload.single('image'), controller.setGroupAvatar);
router.post('/rooms/:roomId/read', controller.markRead);
router.post('/rooms/:roomId/pin', validateRequest(pinMessageSchema), controller.pinMessage);
router.post('/rooms/:roomId/mute', validateRequest(muteSchema), controller.setMuted);
router.patch('/messages/:messageId', validateRequest(editMessageSchema), controller.editMessage);
router.post('/messages/:messageId/recall', validateRequest(messageParamsSchema), controller.recallMessage);
router.post('/messages/:messageId/react', validateRequest(reactSchema), controller.reactMessage);
router.get('/users', validateRequest(searchUsersSchema), controller.searchUsers);

// the room's encryption key - members encrypt request bodies with it
router.get('/rooms/:roomId/key', controller.roomKey);
router.get('/link-preview', validateRequest(linkPreviewSchema), controller.linkPreview);

export const chatRouter = router;
