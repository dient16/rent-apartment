import type http from 'http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';

import { env } from '@/config/env.config';

let io: Server | null = null;

// userId -> number of open sockets (multiple tabs count as one online user)
const onlineCounts = new Map<string, number>();

export const isUserOnline = (userId: string) => (onlineCounts.get(String(userId)) || 0) > 0;

export const getIO = () => io;

export const initSocket = (server: http.Server) => {
  io = new Server(server, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
  });

  // Same JWT as the REST API; the client passes it via `auth.token`.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Unauthorized'));
    jwt.verify(token, env.JWT_ACCESS_KEY, (err, decoded) => {
      if (err || !decoded) return next(new Error('Unauthorized'));
      socket.data.userId = String((decoded as UserDecode)._id);
      next();
    });
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);

    const count = (onlineCounts.get(userId) || 0) + 1;
    onlineCounts.set(userId, count);
    if (count === 1) io?.emit('presence:update', { userId, online: true });

    // Ack with the subset of the given users that are currently online
    socket.on('presence:query', (userIds: unknown, ack?: (online: string[]) => void) => {
      if (typeof ack !== 'function' || !Array.isArray(userIds)) return;
      ack(userIds.filter((id): id is string => typeof id === 'string' && isUserOnline(id)));
    });

    // Standalone chat (/chat): typing fan-out to the other members of a room.
    socket.on('chat:typing', (payload: { roomId?: string; memberIds?: string[]; name?: string; avatar?: string | null; isTyping?: boolean }) => {
      if (!payload?.roomId || !Array.isArray(payload.memberIds)) return;
      for (const memberId of payload.memberIds.slice(0, 200)) {
        if (String(memberId) === userId) continue;
        socket.to(`user:${memberId}`).emit('chat:typing', {
          roomId: String(payload.roomId),
          from: userId,
          name: String(payload.name || 'Someone').slice(0, 60),
          avatar: typeof payload.avatar === 'string' ? payload.avatar.slice(0, 500) : null,
          isTyping: !!payload.isTyping,
        });
      }
    });

    // Standalone chat: WebRTC signalling for 1:1 calls - the server only relays to the callee.
    for (const event of ['call:invite', 'call:answer', 'call:ice', 'call:end'] as const) {
      socket.on(event, (payload: { to?: string } & Record<string, unknown>) => {
        if (!payload?.to || typeof payload.to !== 'string') return;
        const { to, ...rest } = payload;
        socket.to(`user:${to}`).emit(event, { ...rest, from: userId });
      });
    }

    socket.on('typing', (payload: { to?: string; conversationId?: string; isTyping?: boolean }) => {
      if (!payload?.to || !payload?.conversationId) return;
      socket.to(`user:${payload.to}`).emit('typing', {
        conversationId: String(payload.conversationId),
        from: userId,
        isTyping: !!payload.isTyping,
      });
    });

    socket.on('disconnect', () => {
      const remaining = (onlineCounts.get(userId) || 1) - 1;
      if (remaining <= 0) {
        onlineCounts.delete(userId);
        io?.emit('presence:update', { userId, online: false });
      } else {
        onlineCounts.set(userId, remaining);
      }
    });
  });

  return io;
};

/** Push a realtime event to one user (all their tabs). No-op before initSocket. */
export const emitToUser = (userId: string, event: string, payload: unknown) => {
  io?.to(`user:${String(userId)}`).emit(event, payload);
};
