'use client';

import { useEffect, useRef } from 'react';

interface JitsiAPI {
  addEventListeners: (events: Record<string, () => void>) => void;
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

export function JitsiRoom({ roomName, token, displayName, domain = 'meet.jit.si', onReadyToClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiAPI | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    const initJitsi = () => {
      if (cancelled || !containerRef.current) return;

      apiRef.current = new window.JitsiMeetExternalAPI(domain, {
        roomName,
        jwt: token || undefined,
        parentNode: containerRef.current,
        userInfo: { displayName },
        configOverwrite: {
          startWithAudioMuted: true,
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
      });
    };

    let script: HTMLScriptElement | null = null;
    if (window.JitsiMeetExternalAPI) {
      initJitsi();
    } else {
      script = document.createElement('script');
      script.src = `https://${domain}/external_api.js`;
      script.async = true;
      script.onload = initJitsi;
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
      className="w-full h-full min-h-[400px] rounded-lg overflow-hidden bg-slate-900"
    />
  );
}
