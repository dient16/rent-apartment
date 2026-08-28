'use client';

import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { FiMic, FiMicOff, FiPhone, FiPhoneOff, FiVideo, FiVideoOff } from 'react-icons/fi';
import { UserAvatar } from '@/components';
import type { useCall } from './useCall';

type Call = ReturnType<typeof useCall>;

const Video: React.FC<{ stream: MediaStream | null; muted?: boolean; className?: string }> = ({ stream, muted, className }) => {
   const ref = useRef<HTMLVideoElement>(null);
   useEffect(() => {
      if (ref.current) ref.current.srcObject = stream;
   }, [stream]);
   return <video ref={ref} autoPlay playsInline muted={muted} className={className} />;
};

const useTimer = (startedAt: number | null) => {
   const [now, setNow] = useState(() => Date.now());
   useEffect(() => {
      if (!startedAt) return;
      const t = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(t);
   }, [startedAt]);
   if (!startedAt) return '';
   const s = Math.max(0, Math.floor((now - startedAt) / 1000));
   return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const round =
   'flex justify-center items-center w-14 h-14 rounded-full border-none cursor-pointer transition-transform hover:scale-105 shadow-lg';

/** Full-screen call UI: ringing card (incoming), calling state, live audio / video with controls. */
const CallOverlay: React.FC<{ call: Call }> = ({ call }) => {
   const timer = useTimer(call.startedAt);
   if (call.status === 'idle' || !call.peer) return null;
   const isVideo = call.kind === 'video';
   const live = call.status === 'connected';
   const subtitle =
      call.status === 'ringing'
         ? `Incoming ${isVideo ? 'video' : 'voice'} call`
         : call.status === 'calling'
           ? 'Calling…'
           : call.status === 'connecting'
             ? 'Connecting…'
             : timer;

   return (
      <div className="flex fixed inset-0 z-[1100] flex-col justify-between items-center bg-gray-950 font-main">
         {/* remote media */}
         {isVideo && live ? (
            <Video stream={call.remoteStream} className="object-cover absolute inset-0 w-full h-full" />
         ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-950 to-black" />
         )}
         {isVideo && call.localStream && (
            <Video stream={call.localStream} muted className={clsx('object-cover absolute top-4 right-4 w-32 rounded-2xl shadow-xl aspect-[3/4] ring-2 ring-white/20 sm:w-40', call.cameraOff && 'opacity-30')} />
         )}
         {/* hidden audio sink for voice calls */}
         {!isVideo && <Video stream={call.remoteStream} className="hidden" />}

         {/* peer */}
         <div className={clsx('flex relative flex-col gap-3 items-center pt-16 text-center', isVideo && live && 'sr-only')}>
            <span className={clsx('rounded-full', call.status !== 'connected' && 'animate-pulse ring-8 ring-white/10')}>
               <UserAvatar size={112} src={call.peer.avatar} name={call.peer.name} />
            </span>
            <p className="text-2xl font-bold text-white">{call.peer.name}</p>
            <p className="text-sm text-white/70">{subtitle}</p>
         </div>
         {isVideo && live && (
            <div className="relative px-4 py-1.5 mt-6 text-sm text-white rounded-full bg-black/40 backdrop-blur">
               {call.peer.name} · {timer}
            </div>
         )}

         {/* controls */}
         <div className="flex relative gap-5 items-center pb-12">
            {call.status === 'ringing' ? (
               <>
                  <button type="button" onClick={call.reject} className={`${round} text-white bg-red-500`} aria-label="Decline"><FiPhoneOff size={22} /></button>
                  <button type="button" onClick={call.accept} className={`${round} text-white bg-emerald-500 animate-bounce`} aria-label="Accept">{isVideo ? <FiVideo size={22} /> : <FiPhone size={22} />}</button>
               </>
            ) : (
               <>
                  <button type="button" onClick={call.toggleMute} className={`${round} ${call.muted ? 'text-gray-900 bg-white' : 'text-white bg-white/15 backdrop-blur'}`} aria-label="Mute">{call.muted ? <FiMicOff size={20} /> : <FiMic size={20} />}</button>
                  {isVideo && (
                     <button type="button" onClick={call.toggleCamera} className={`${round} ${call.cameraOff ? 'text-gray-900 bg-white' : 'text-white bg-white/15 backdrop-blur'}`} aria-label="Camera">{call.cameraOff ? <FiVideoOff size={20} /> : <FiVideo size={20} />}</button>
                  )}
                  <button type="button" onClick={call.hangUp} className={`${round} text-white bg-red-500`} aria-label="Hang up"><FiPhoneOff size={22} /></button>
               </>
            )}
         </div>
      </div>
   );
};

export default CallOverlay;
