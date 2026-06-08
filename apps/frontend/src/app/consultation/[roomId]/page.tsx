'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import api from '@/lib/api';
import { JitsiRoom } from '@/components/video/JitsiRoom';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<VideoToken>(`/appointments/${roomId}/video-token`)
      .then((r) => setVideoData(r.data))
      .catch(() => {
        toast.error('No se pudo obtener el token de video');
        router.back();
      })
      .finally(() => setLoading(false));
  }, [roomId, router]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <p>Conectando a la sala...</p>
      </div>
    );
  }

  if (!videoData) return null;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-700">
        <span className="text-white font-semibold text-sm">EMINOR — Videoconsulta</span>
        <button
          onClick={handleClose}
          className="text-sm text-slate-300 hover:text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
        >
          Finalizar consulta
        </button>
      </div>
      <div className="flex-1">
        <JitsiRoom
          roomName={videoData.roomName}
          token={videoData.token}
          displayName={user?.email ?? 'Usuario'}
          domain={videoData.domain}
          onReadyToClose={handleClose}
        />
      </div>
    </div>
  );
}
