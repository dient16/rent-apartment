import type { NextFunction, Request, Response } from '@/types/http';

import { fetchLinkPreview } from './chat.links';
import { chatCommands } from './commands/chat.commands';
import { chatQueries } from './queries/chat.queries';

const me = (req: Request) => String((req.user as UserDecode)._id);
const roomId = (req: Request) => String(req.params.roomId);

type Handler = (req: Request) => Promise<{ send: (res: Response) => void }>;
const handle =
  (fn: Handler) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      (await fn(req)).send(res);
    } catch (error) {
      next(error);
    }
  };

export const listRooms = handle((req) => chatQueries.listRooms(me(req)));
export const getRoom = handle((req) => chatQueries.getRoom(roomId(req), me(req)));
export const createDirect = handle((req) => chatCommands.createDirect(me(req), req.body.userId));
export const createGroup = handle((req) => chatCommands.createGroup(me(req), req.body.name, req.body.memberIds));
export const renameGroup = handle((req) => chatCommands.renameGroup(me(req), roomId(req), req.body.name));
export const addMembers = handle((req) => chatCommands.addMembers(me(req), roomId(req), req.body.memberIds));
export const setMemberRole = handle((req) => chatCommands.setMemberRole(me(req), roomId(req), String(req.params.userId), req.body.role));
export const pinMessage = handle((req) => chatCommands.pinMessage(me(req), roomId(req), req.body.messageId ?? null));
export const setMuted = handle((req) => chatCommands.setMuted(me(req), roomId(req), !!req.body.muted));
export const removeMember = handle((req) => chatCommands.removeMember(me(req), roomId(req), String(req.params.userId)));
export const listMessages = handle((req) => {
  const { limit, before } = req.query as unknown as { limit: number; before?: string };
  return chatQueries.listMessages(roomId(req), me(req), limit, before);
});
export const sendText = handle((req) =>
  req.body.cipher
    ? chatCommands.sendEncrypted(me(req), roomId(req), req.body.type ?? 'text', req.body.cipher, req.body.replyTo, req.body.mentions)
    : chatCommands.sendText(me(req), roomId(req), req.body.content, req.body.replyTo)
);
export const roomKey = handle((req) => chatCommands.ensureRoomKey(me(req), roomId(req)));
export const listMedia = handle((req) => {
  const { limit, before } = req.query as unknown as { limit: number; before?: string };
  return chatQueries.listMedia(roomId(req), me(req), limit, before);
});
export const setGroupAvatar = handle((req) => {
  const file = (req as Request & { file?: { buffer: Buffer; mimetype: string; size: number } }).file;
  if (!file) return Promise.resolve({ send: (res: Response) => void res.status(400).send({ success: false, message: 'No image uploaded' }) });
  return chatCommands.setGroupAvatar(me(req), roomId(req), file);
});
export const reactMessage = handle((req) => chatCommands.reactMessage(me(req), String(req.params.messageId), req.body.emoji));
export const sendImage = handle((req) => {
  const file = (req as Request & { file?: { buffer: Buffer; mimetype: string; size: number } }).file;
  if (!file) return Promise.resolve({ send: (res: Response) => void res.status(400).send({ success: false, message: 'No image uploaded' }) });
  const replyTo = typeof req.body?.replyTo === 'string' && /^[a-f0-9]{24}$/.test(req.body.replyTo) ? req.body.replyTo : undefined;
  const album = typeof req.body?.album === 'string' && /^[a-z0-9-]{6,40}$/i.test(req.body.album) ? req.body.album : undefined;
  // e2e upload: keyId + iv (base64, 12 bytes) + the real content type travel as form fields
  const b = req.body ?? {};
  const e2e =
    typeof b.keyId === 'string' && /^[a-z0-9-]{6,64}$/i.test(b.keyId) && typeof b.iv === 'string' && /^[A-Za-z0-9+/]{16}$/.test(b.iv)
      ? { keyId: b.keyId, iv: b.iv, contentType: /^image\/(jpeg|png|gif|webp)$/.test(String(b.contentType)) ? String(b.contentType) : 'image/jpeg' }
      : undefined;
  return chatCommands.sendImage(me(req), roomId(req), file, replyTo, album, e2e);
});
export const editMessage = handle((req) => chatCommands.editMessage(me(req), String(req.params.messageId), req.body));
export const recallMessage = handle((req) => chatCommands.recallMessage(me(req), String(req.params.messageId)));
export const markRead = handle((req) => chatCommands.markRead(me(req), roomId(req)));
export const searchUsers = handle((req) => {
  const { q, limit } = req.query as unknown as { q: string; limit: number };
  return chatQueries.searchUsers(me(req), q, limit);
});

/** Preview card for a URL a member pasted into the chat. */
export const linkPreview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const preview = await fetchLinkPreview(String(req.query.url));
    res.json({ success: true, message: 'Link preview', data: preview });
  } catch (error) {
    next(error);
  }
};

/** Signed image URL - no bearer token (used by <img>), the HMAC + expiry is the auth. */
export const readImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const image = await chatQueries.readImage(String(req.params.fileId), req.query.exp, req.query.sig);
    if (!image) {
      res.status(404).send({ success: false, message: 'Image not found' });
      return;
    }
    res.setHeader('Content-Type', image.contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    if (image.e2e) res.setHeader('X-Chat-E2E', '1');
    res.send(image.data);
  } catch (error) {
    next(error);
  }
};
