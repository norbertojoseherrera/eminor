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

    const script = document.createElement('script');
    script.src = `https://${domain}/external_api.js`;
    script.async = true;

    script.onload = () => {
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

    document.head.appendChild(script);

    return () => {
      apiRef.current?.dispose();
      document.head.removeChild(script);
    };
  }, [roomName, token, domain, displayName, onReadyToClose]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[400px] rounded-lg overflow-hidden bg-slate-900"
    />
  );
}
