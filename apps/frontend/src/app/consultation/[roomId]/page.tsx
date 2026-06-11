'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { JitsiRoom } from '@/components/video/JitsiRoom';
import { DeviceCheckLobby } from '@/components/video/DeviceCheckLobby';

interface VideoToken {
  token: string;
  roomName: string;
  domain: string;
}

export default function ConsultationPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [videoData, setVideoData] = useState<VideoToken | null>(null);
  const [muteOpts, setMuteOpts] = useState<{ audioMuted: boolean; videoMuted: boolean } | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleClose = async () => {
    if (user?.role === 'DOCTOR') {
      try {
        await api.patch(`/appointments/${roomId}/status`, { status: 'COMPLETED' });
      } catch {
        // silently ignore, still navigate away
      }
    }
    router.push(user?.role === 'DOCTOR' ? '/doctor/schedule' : '/patient/appointments');
  };

  const handleJoin = async (opts: { audioMuted: boolean; videoMuted: boolean }) => {
    setJoining(true);
    setJoinError(null);
    try {
      const { data } = await api.get<VideoToken>(`/appointments/${roomId}/video-token`);
      setVideoData(data);
      setMuteOpts(opts);
    } catch (err) {
      const raw = (err as { response?: { data?: { message?: string | { message?: string } } } })?.response?.data?.message;
      const message = typeof raw === 'string' ? raw : raw?.message;
      setJoinError(message ?? 'No se pudo ingresar a la sala de videoconsulta. Intentá nuevamente.');
    } finally {
      setJoining(false);
    }
  };

  if (!videoData || !muteOpts) {
    return (
      <DeviceCheckLobby
        title="Sala de espera virtual"
        subtitle="Verificá tu cámara y micrófono antes de ingresar a la consulta"
        onJoin={handleJoin}
        joining={joining}
        joinError={joinError}
      />
    );
  }

  return (
    <div className="h-screen bg-slate-900 flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-700">
        <span className="text-white font-semibold text-sm">EMINOR — Videoconsulta</span>
        <button
          onClick={handleClose}
          className="text-sm text-slate-300 hover:text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
        >
          Finalizar consulta
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <JitsiRoom
          roomName={videoData.roomName}
          token={videoData.token}
          displayName={user?.email ?? 'Usuario'}
          domain={videoData.domain}
          onReadyToClose={handleClose}
          startWithAudioMuted={muteOpts.audioMuted}
          startWithVideoMuted={muteOpts.videoMuted}
        />
      </div>
    </div>
  );
}
