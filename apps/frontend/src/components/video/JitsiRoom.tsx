'use client';

import { useEffect, useRef } from 'react';

interface JitsiAPI {
  addEventListeners: (events: Record<string, (e?: { muted: boolean }) => void>) => void;
  dispose: () => void;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    JitsiMeetExternalAPI: any;
  }
}

interface Props {
  roomName: string;
  token: string;
  displayName: string;
  domain?: string;
  onReadyToClose?: () => void;
}

// meet.jit.si corta automaticamente las llamadas embebidas via iframe a los 5 minutos
// ("Embedding meet.jit.si is only meant for demo purposes"). Para sostener consultas
// mas largas, recreamos la sala antes de ese corte (reconexion silenciosa).
const RECONNECT_INTERVAL_MS = 4 * 60 * 1000 + 30 * 1000; // 4:30

export function JitsiRoom({ roomName, token, displayName, domain = 'meet.jit.si', onReadyToClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiAPI | null>(null);
  const audioMutedRef = useRef(true);
  const videoMutedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const createApi = () => {
      if (cancelled || !containerRef.current) return;

      apiRef.current?.dispose();

      apiRef.current = new window.JitsiMeetExternalAPI(domain, {
        roomName,
        jwt: token || undefined,
        parentNode: containerRef.current,
        userInfo: { displayName },
        configOverwrite: {
          startWithAudioMuted: audioMutedRef.current,
          startWithVideoMuted: videoMutedRef.current,
          disableDeepLinking: true,
          prejoinPageEnabled: false,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup', 'chat', 'raisehand', 'tileview'],
          SHOW_JITSI_WATERMARK: false,
        },
      });

      apiRef.current?.addEventListeners({
        readyToClose: () => onReadyToClose?.(),
        audioMuteStatusChanged: (e) => { if (e) audioMutedRef.current = e.muted; },
        videoMuteStatusChanged: (e) => { if (e) videoMutedRef.current = e.muted; },
      });

      reconnectTimer = setTimeout(createApi, RECONNECT_INTERVAL_MS);
    };

    let script: HTMLScriptElement | null = null;
    if (window.JitsiMeetExternalAPI) {
      createApi();
    } else {
      script = document.createElement('script');
      script.src = `https://${domain}/external_api.js`;
      script.async = true;
      script.onload = createApi;
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      apiRef.current?.dispose();
      apiRef.current = null;
      if (script) document.head.removeChild(script);
    };
  }, [roomName, token, domain, displayName, onReadyToClose]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-lg overflow-hidden bg-slate-900"
    />
  );
}
