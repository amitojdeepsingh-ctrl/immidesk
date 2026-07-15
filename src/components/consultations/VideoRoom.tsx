"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2 } from "lucide-react";

interface VideoRoomProps {
  token: string;
  roomName: string;
  identity: string;
  onLeave?: () => void;
}

export default function VideoRoom({ token, roomName, identity, onLeave }: VideoRoomProps) {
  const [room, setRoom] = useState<any>(null);
  const [error, setError] = useState("");
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [connecting, setConnecting] = useState(true);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const lkUrl = process.env["NEXT_PUBLIC_LIVEKIT_URL"];

  const connect = useCallback(async () => {
    if (!lkUrl) { setError("LiveKit URL not configured"); setConnecting(false); return; }

    const { Room, VideoPresets } = await import("livekit-client");
    const r = new Room({ videoCaptureDefaults: { resolution: VideoPresets.h720 } });

    r.on("participantConnected", (p: any) => {
      p.tracks.forEach((pub: any) => {
        if (pub.track && remoteVideo.current) {
          pub.track.attach(remoteVideo.current);
        }
      });
    });

    r.on("trackSubscribed", (_track: any, _pub: any, p: any) => {
      if (remoteVideo.current) {
        _track.attach(remoteVideo.current);
      }
    });

    r.on("disconnected", () => setConnecting(false));

    try {
      await r.connect(lkUrl, token);
      setRoom(r);
      if (localVideo.current && r.localParticipant?.videoTrackPublications?.size > 0) {
        r.localParticipant.videoTrackPublications.forEach((pub: any) => {
          if (pub.track) pub.track.attach(localVideo.current);
        });
      }
    } catch (e: any) {
      setError(e?.message ?? "Failed to connect");
    }
    setConnecting(false);
  }, [token, lkUrl]);

  useEffect(() => { connect(); }, [connect]);

  const toggleCam = async () => {
    if (!room) return;
    if (camOn) {
      await room.localParticipant.setCameraEnabled(false);
    } else {
      await room.localParticipant.setCameraEnabled(true);
    }
    setCamOn(!camOn);
  };

  const toggleMic = async () => {
    if (!room) return;
    if (micOn) {
      await room.localParticipant.setMicrophoneEnabled(false);
    } else {
      await room.localParticipant.setMicrophoneEnabled(true);
    }
    setMicOn(!micOn);
  };

  const disconnect = () => {
    room?.disconnect();
    onLeave?.();
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/50 dark:bg-red-950/20">
        <p className="text-sm font-medium text-red-700 dark:text-red-400">Could not join video room</p>
        <p className="mt-1 text-xs text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg bg-zinc-900">
      {connecting && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      )}

      <div className="relative aspect-video bg-zinc-800">
        <video ref={remoteVideo} autoPlay playsInline className="h-full w-full object-cover" />
        <div className="absolute bottom-4 right-4 h-32 w-48 overflow-hidden rounded-lg border-2 border-zinc-600 bg-zinc-700">
          <video ref={localVideo} autoPlay playsInline muted className="h-full w-full object-cover" />
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 px-4 py-3">
        <button onClick={toggleMic}
          className="flex items-center gap-2 rounded-full bg-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600 transition-colors">
          {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-red-400" />}
          {micOn ? "Mute" : "Unmute"}
        </button>
        <button onClick={toggleCam}
          className="flex items-center gap-2 rounded-full bg-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600 transition-colors">
          {camOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4 text-red-400" />}
          {camOn ? "Camera Off" : "Camera On"}
        </button>
        <button onClick={disconnect}
          className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 transition-colors">
          <PhoneOff className="h-4 w-4" /> Leave
        </button>
      </div>
    </div>
  );
}
