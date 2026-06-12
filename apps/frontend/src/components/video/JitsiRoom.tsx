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
  startWithAudioMuted?: boolean;
  startWithVideoMuted?: boolean;
}

export function JitsiRoom({
  roomName,
  token,
  displayName,
  domain = 'meet.jit.si',
  onReadyToClose,
  startWithAudioMuted = true,
  startWithVideoMuted = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiAPI | null>(null);
  const audioMutedRef = useRef(startWithAudioMuted);
  const videoMutedRef = useRef(startWithVideoMuted);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

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
    };

    // En 8x8 JaaS, el script externo se sirve bajo el path del App ID
    // (prefijo de roomName: "<appId>/<roomUuid>").
    const scriptPath = domain === '8x8.vc' ? `${roomName.split('/')[0]}/external_api.js` : 'external_api.js';

    let script: HTMLScriptElement | null = null;
    if (window.JitsiMeetExternalAPI) {
      createApi();
    } else {
      script = document.createElement('script');
      script.src = `https://${domain}/${scriptPath}`;
      script.async = true;
      script.onload = createApi;
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
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
