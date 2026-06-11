'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Mic, MicOff, Video, VideoOff, Wifi, WifiOff, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  title: string;
  subtitle?: string;
  onJoin: (opts: { audioMuted: boolean; videoMuted: boolean }) => void;
  joining?: boolean;
  joinError?: string | null;
}

function subscribeToOnlineStatus(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function useOnlineStatus() {
  return useSyncExternalStore(
    subscribeToOnlineStatus,
    () => navigator.onLine,
    () => true,
  );
}

export function DeviceCheckLobby({ title, subtitle, onJoin, joining, joinError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const online = useOnlineStatus();

  useEffect(() => {
    let cancelled = false;
    let audioCtx: AudioContext | null = null;
    let rafId: number | null = null;

    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtx = new AudioCtx();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setAudioLevel(avg);
          rafId = requestAnimationFrame(tick);
        };
        tick();
      })
      .catch(() => {
        setPermissionError('No se pudo acceder a la cámara o el micrófono. Revisá los permisos del navegador para continuar.');
      });

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      audioCtx?.close();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const toggleAudio = () => {
    setAudioMuted((muted) => {
      streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = muted));
      return !muted;
    });
  };

  const toggleVideo = () => {
    setVideoMuted((muted) => {
      streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = muted));
      return !muted;
    });
  };

  const handleJoin = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onJoin({ audioMuted, videoMuted });
  };

  const audioBars = Math.min(5, Math.round((audioLevel / 255) * 5 * 3));

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-lg font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>

        <div className="aspect-video rounded-xl overflow-hidden bg-slate-800 relative flex items-center justify-center">
          {permissionError ? (
            <div className="text-center px-6 text-sm text-amber-400 flex flex-col items-center gap-2">
              <AlertTriangle className="size-6" />
              <span>{permissionError}</span>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${videoMuted ? 'opacity-0' : ''}`}
            />
          )}
          {videoMuted && !permissionError && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
              <VideoOff className="size-8" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button
            type="button"
            variant={audioMuted ? 'destructive' : 'secondary'}
            size="icon-lg"
            onClick={toggleAudio}
            disabled={!!permissionError}
            aria-label={audioMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
          >
            {audioMuted ? <MicOff /> : <Mic />}
          </Button>
          <Button
            type="button"
            variant={videoMuted ? 'destructive' : 'secondary'}
            size="icon-lg"
            onClick={toggleVideo}
            disabled={!!permissionError}
            aria-label={videoMuted ? 'Activar cámara' : 'Apagar cámara'}
          >
            {videoMuted ? <VideoOff /> : <Video />}
          </Button>

          <div className="flex items-center gap-1 ml-2 h-9 px-2.5 rounded-lg bg-slate-800">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className={`w-1 rounded-full transition-all ${
                  i < audioBars ? 'bg-emerald-400' : 'bg-slate-600'
                }`}
                style={{ height: `${6 + i * 3}px` }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          {online ? <Wifi className="size-3.5 text-emerald-400" /> : <WifiOff className="size-3.5 text-red-400" />}
          <span>{online ? 'Conexión a internet estable' : 'Sin conexión a internet'}</span>
        </div>

        {joinError && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300 text-center">
            {joinError}
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          onClick={handleJoin}
          disabled={joining || !online}
        >
          {joining ? <Loader2 className="size-4 animate-spin" /> : null}
          {joining ? 'Conectando...' : 'Ingresar a la consulta'}
        </Button>
      </div>
    </div>
  );
}
