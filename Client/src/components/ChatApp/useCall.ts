'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { connectSocket, getSocket } from '@/lib/socket';

export type CallKind = 'audio' | 'video';
export type CallStatus = 'idle' | 'calling' | 'ringing' | 'connecting' | 'connected';

export interface CallPeer {
   _id: string;
   name: string;
   avatar: string | null;
}

interface CallState {
   status: CallStatus;
   kind: CallKind;
   peer: CallPeer | null;
   roomId: string | null;
   /** set when the call is established */
   startedAt: number | null;
   muted: boolean;
   cameraOff: boolean;
   error: string | null;
}

const IDLE: CallState = { status: 'idle', kind: 'audio', peer: null, roomId: null, startedAt: null, muted: false, cameraOff: false, error: null };
const RING_TIMEOUT_MS = 30_000;
const ICE_SERVERS: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

interface InvitePayload {
   from: string;
   name: string;
   avatar: string | null;
   roomId: string;
   kind: CallKind;
   offer: RTCSessionDescriptionInit;
}

/**
 * 1:1 voice / video calls over WebRTC. Signalling (offer / answer / ICE / hang-up) rides
 * the existing socket as `call:*` events relayed by the server to the other user; media
 * goes peer-to-peer (STUN only - no TURN, so some strict NATs will not connect).
 */
export const useCall = (me: { _id?: string; firstname?: string; avatar?: string | null } | null) => {
   const [state, setState] = useState<CallState>(IDLE);
   const [localStream, setLocalStream] = useState<MediaStream | null>(null);
   const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
   const pcRef = useRef<RTCPeerConnection | null>(null);
   const localRef = useRef<MediaStream | null>(null);
   const peerIdRef = useRef<string | null>(null);
   const pendingOfferRef = useRef<InvitePayload | null>(null);
   const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
   const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

   const socket = (): Socket | null => getSocket() || connectSocket();

   const stopMedia = () => {
      localRef.current?.getTracks().forEach((t) => t.stop());
      localRef.current = null;
      setLocalStream(null);
      setRemoteStream(null);
   };

   const cleanup = useCallback((error: string | null = null) => {
      if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
      pcRef.current?.close();
      pcRef.current = null;
      peerIdRef.current = null;
      pendingOfferRef.current = null;
      pendingIceRef.current = [];
      stopMedia();
      setState({ ...IDLE, error });
   }, []);

   const getMedia = async (kind: CallKind) => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === 'video' ? { width: 1280, height: 720 } : false });
      localRef.current = stream;
      setLocalStream(stream);
      return stream;
   };

   const createPeer = (to: string) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      const remote = new MediaStream();
      setRemoteStream(remote);
      pc.ontrack = (event) => {
         event.streams[0]?.getTracks().forEach((t) => remote.addTrack(t));
         setRemoteStream(new MediaStream(remote.getTracks()));
      };
      pc.onicecandidate = (event) => {
         if (event.candidate) socket()?.emit('call:ice', { to, candidate: event.candidate.toJSON() });
      };
      pc.onconnectionstatechange = () => {
         if (pc.connectionState === 'connected') setState((s) => ({ ...s, status: 'connected', startedAt: s.startedAt ?? Date.now() }));
         if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') cleanup('Connection lost');
      };
      pcRef.current = pc;
      return pc;
   };

   /* ---------------- outgoing ---------------- */

   const startCall = useCallback(
      async (peer: CallPeer, roomId: string, kind: CallKind) => {
         if (state.status !== 'idle') return;
         try {
            const stream = await getMedia(kind);
            peerIdRef.current = peer._id;
            setState({ ...IDLE, status: 'calling', kind, peer, roomId });
            const pc = createPeer(peer._id);
            stream.getTracks().forEach((t) => pc.addTrack(t, stream));
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket()?.emit('call:invite', { to: peer._id, roomId, kind, offer, name: me?.firstname || 'Someone', avatar: me?.avatar ?? null });
            ringTimerRef.current = setTimeout(() => {
               socket()?.emit('call:end', { to: peer._id, reason: 'timeout' });
               cleanup('No answer');
            }, RING_TIMEOUT_MS);
         } catch (error) {
            cleanup((error as Error).name === 'NotAllowedError' ? 'Microphone / camera permission denied' : (error as Error).message);
         }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [state.status, me?.firstname, me?.avatar, cleanup],
   );

   /* ---------------- incoming ---------------- */

   const accept = useCallback(async () => {
      const invite = pendingOfferRef.current;
      if (!invite) return;
      try {
         if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
         setState((s) => ({ ...s, status: 'connecting' }));
         const stream = await getMedia(invite.kind);
         const pc = createPeer(invite.from);
         stream.getTracks().forEach((t) => pc.addTrack(t, stream));
         await pc.setRemoteDescription(invite.offer);
         for (const c of pendingIceRef.current) await pc.addIceCandidate(c).catch(() => {});
         pendingIceRef.current = [];
         const answer = await pc.createAnswer();
         await pc.setLocalDescription(answer);
         socket()?.emit('call:answer', { to: invite.from, answer });
      } catch (error) {
         socket()?.emit('call:end', { to: invite.from, reason: 'error' });
         cleanup((error as Error).name === 'NotAllowedError' ? 'Microphone / camera permission denied' : (error as Error).message);
      }
      // createPeer / getMedia only touch refs and setters - stable for the hook's lifetime
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [cleanup]);

   const reject = useCallback(() => {
      const to = peerIdRef.current;
      if (to) socket()?.emit('call:end', { to, reason: 'rejected' });
      cleanup();
   }, [cleanup]);

   const hangUp = useCallback(() => {
      const to = peerIdRef.current;
      if (to) socket()?.emit('call:end', { to, reason: 'hangup' });
      cleanup();
   }, [cleanup]);

   const toggleMute = () => {
      const next = !state.muted;
      localRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
      setState((s) => ({ ...s, muted: next }));
   };
   const toggleCamera = () => {
      const next = !state.cameraOff;
      localRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
      setState((s) => ({ ...s, cameraOff: next }));
   };

   /* ---------------- signalling ---------------- */

   useEffect(() => {
      const s = socket();
      if (!s) return;
      const onInvite = (payload: InvitePayload) => {
         if (pcRef.current || pendingOfferRef.current) {
            s.emit('call:end', { to: payload.from, reason: 'busy' });
            return;
         }
         pendingOfferRef.current = payload;
         peerIdRef.current = payload.from;
         setState({ ...IDLE, status: 'ringing', kind: payload.kind, roomId: payload.roomId, peer: { _id: payload.from, name: payload.name, avatar: payload.avatar } });
         ringTimerRef.current = setTimeout(() => cleanup('Missed call'), RING_TIMEOUT_MS);
      };
      const onAnswer = async (payload: { from: string; answer: RTCSessionDescriptionInit }) => {
         const pc = pcRef.current;
         if (!pc || payload.from !== peerIdRef.current) return;
         if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
         await pc.setRemoteDescription(payload.answer);
         for (const c of pendingIceRef.current) await pc.addIceCandidate(c).catch(() => {});
         pendingIceRef.current = [];
         setState((st) => ({ ...st, status: 'connecting' }));
      };
      const onIce = async (payload: { from: string; candidate: RTCIceCandidateInit }) => {
         if (payload.from !== peerIdRef.current) return;
         const pc = pcRef.current;
         if (pc?.remoteDescription) await pc.addIceCandidate(payload.candidate).catch(() => {});
         else pendingIceRef.current.push(payload.candidate);
      };
      const onEnd = (payload: { from: string; reason?: string }) => {
         if (payload.from !== peerIdRef.current) return;
         const reasons: Record<string, string> = { rejected: 'Call declined', busy: 'The other person is on another call', timeout: 'No answer' };
         cleanup(payload.reason ? (reasons[payload.reason] ?? null) : null);
      };
      s.on('call:invite', onInvite);
      s.on('call:answer', onAnswer);
      s.on('call:ice', onIce);
      s.on('call:end', onEnd);
      return () => {
         s.off('call:invite', onInvite);
         s.off('call:answer', onAnswer);
         s.off('call:ice', onIce);
         s.off('call:end', onEnd);
      };
   }, [cleanup]);

   // hang up when the page closes
   useEffect(() => {
      const bye = () => {
         const to = peerIdRef.current;
         if (to) socket()?.emit('call:end', { to, reason: 'hangup' });
      };
      window.addEventListener('beforeunload', bye);
      return () => window.removeEventListener('beforeunload', bye);
   }, []);

   const clearError = () => setState((s) => ({ ...s, error: null }));

   return { ...state, localStream, remoteStream, startCall, accept, reject, hangUp, toggleMute, toggleCamera, clearError };
};
