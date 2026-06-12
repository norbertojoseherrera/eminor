'use client';

import { useEffect, useState, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import api from '@/lib/api';
import { JitsiRoom } from '@/components/video/JitsiRoom';
import { DeviceCheckLobby } from '@/components/video/DeviceCheckLobby';
import { Study } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface VideoToken {
  token: string;
  roomName: string;
  domain: string;
}

const FILE_ICONS: Record<string, string> = { PDF: '📄', JPG: '🖼️', PNG: '🖼️' };

export default function ConsultationPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [videoData, setVideoData] = useState<VideoToken | null>(null);
  const [muteOpts, setMuteOpts] = useState<{ audioMuted: boolean; videoMuted: boolean } | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [studies, setStudies] = useState<Study[]>([]);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const patientId = user?.patient?.id;

  const loadStudies = () => {
    if (!patientId) return;
    api.get<Study[]>(`/studies/patient/${patientId}`)
      .then((r) => setStudies(r.data))
      .catch(() => toast.error('Error al cargar estudios'));
  };

  useEffect(() => { loadStudies(); }, [patientId]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !patientId || !title.trim()) { toast.error('Completá el título y seleccioná un archivo'); return; }
    const ext = file.name.split('.').pop()?.toUpperCase();
    if (!['PDF', 'JPG', 'JPEG', 'PNG'].includes(ext ?? '')) { toast.error('Solo PDF, JPG o PNG'); return; }
    const fileType = ext === 'JPEG' ? 'JPG' : (ext as 'PDF' | 'JPG' | 'PNG');
    setUploading(true);
    try {
      const { data } = await api.post('/studies/presigned-url', { patientId, title, fileName: file.name, fileType });
      await fetch(data.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      toast.success('Estudio subido correctamente');
      setTitle(''); if (fileRef.current) fileRef.current.value = '';
      loadStudies();
    } catch { toast.error('Error al subir el estudio'); } finally { setUploading(false); }
  };

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

  if (user?.role === 'DOCTOR') {
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

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100dvh-9rem)] lg:h-screen overflow-hidden">
      {/* Panel de video */}
      <div className="h-[38dvh] lg:h-auto lg:w-1/2 bg-slate-900 flex flex-col shrink-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
          <span className="text-white font-semibold text-sm">EMINOR — Videoconsulta</span>
          <button
            onClick={handleClose}
            className="text-xs text-slate-300 hover:text-white px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors shrink-0 ml-2"
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

      {/* Panel de estudios */}
      <div className="flex-1 lg:w-1/2 overflow-y-auto bg-white p-4 sm:p-5 min-h-0">
        <h2 className="text-base font-bold text-foreground mb-1">Mis Estudios</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Subí estudios médicos para que el/la profesional los revise durante esta consulta.
        </p>

        <div className="bg-card rounded-2xl border border-border/60 p-4 mb-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <span>📎</span> Subir nuevo estudio
          </h3>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Título del estudio</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Análisis de sangre completo" className="mt-1 h-10 rounded-xl text-sm" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Archivo (PDF, JPG, PNG)</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png" ref={fileRef} className="mt-1 h-10 rounded-xl text-sm" />
            </div>
            <Button onClick={handleUpload} disabled={uploading}
              className="w-full rounded-xl bg-primary hover:bg-primary/90 h-10 text-sm">
              {uploading ? 'Subiendo...' : 'Subir estudio'}
            </Button>
          </div>
        </div>

        {studies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-3xl mb-2">📁</div>
            <p className="text-sm font-medium">No hay estudios cargados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {studies.map((s) => (
              <div key={s.id} className="bg-card rounded-2xl border border-border/60 p-3 flex items-center gap-3 shadow-sm">
                <span className="text-xl shrink-0">{FILE_ICONS[s.fileType] ?? '📄'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(s.uploadedAt).toLocaleDateString('es-AR')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
