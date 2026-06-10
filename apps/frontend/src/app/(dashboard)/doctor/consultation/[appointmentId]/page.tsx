'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import api from '@/lib/api';
import { JitsiRoom } from '@/components/video/JitsiRoom';
import { SoapForm } from '@/components/evolution/SoapForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Evolution, Study } from '@/types';

interface VideoToken { token: string; roomName: string; domain: string }
interface MedicalRecord {
  firstName: string;
  lastName: string;
  evolutions: Evolution[];
  studies: Study[];
}

export default function DoctorConsultationPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [videoData, setVideoData] = useState<VideoToken | null>(null);
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecord | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ patientId: string; patient: { id: string } }>(`/appointments/${appointmentId}`)
      .then(async (r) => {
        const pid = r.data.patient?.id ?? r.data.patientId;
        setPatientId(pid);

        const [video, record] = await Promise.all([
          api.get<VideoToken>(`/appointments/${appointmentId}/video-token`),
          api.get<MedicalRecord>(`/patients/${pid}/medical-record`),
        ]);
        setVideoData(video.data);
        setMedicalRecord(record.data);
      })
      .catch(() => {
        toast.error('Error al cargar la consulta');
        router.push('/doctor/schedule');
      });
  }, [appointmentId, router]);

  const handleEnd = async () => {
    try {
      await api.patch(`/appointments/${appointmentId}/status`, { status: 'COMPLETED' });
    } finally {
      router.push('/doctor/schedule');
    }
  };

  if (!videoData || !medicalRecord) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando sala de consulta...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left panel — Video */}
      <div className="w-1/2 bg-slate-900 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
          <span className="text-white text-sm font-medium">
            Paciente: {medicalRecord.firstName} {medicalRecord.lastName}
          </span>
          <button onClick={handleEnd} className="text-xs text-slate-400 hover:text-white px-3 py-1 rounded bg-slate-700">
            Finalizar
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <JitsiRoom
            roomName={videoData.roomName}
            token={videoData.token}
            displayName={user?.email ?? 'Doctor'}
            domain={videoData.domain}
            onReadyToClose={handleEnd}
          />
        </div>
      </div>

      {/* Right panel — HCE + SOAP */}
      <div className="w-1/2 overflow-y-auto bg-white">
        <Tabs defaultValue="soap" className="h-full">
          <TabsList className="w-full rounded-none border-b">
            <TabsTrigger value="soap" className="flex-1">Nueva Evolución SOAP</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">Historial HCE</TabsTrigger>
            <TabsTrigger value="studies" className="flex-1">Estudios</TabsTrigger>
          </TabsList>

          <TabsContent value="soap" className="p-4">
            <SoapForm appointmentId={appointmentId} onSaved={() => {}} />
          </TabsContent>

          <TabsContent value="history" className="p-4 space-y-3">
            {medicalRecord.evolutions.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin evoluciones previas.</p>
            ) : (
              medicalRecord.evolutions.map((evo) => (
                <Card key={evo.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      {new Date(evo.createdAt).toLocaleDateString('es-AR')}
                      {evo.isSigned && <span className="ml-2 text-xs text-green-600">✓ Firmado</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2">
                    <p><strong>S:</strong> {evo.soapData.subjective}</p>
                    <p><strong>O:</strong> {evo.soapData.objective}</p>
                    <p><strong>A:</strong> {evo.soapData.assessment.text} [{evo.soapData.assessment.cie10Codes.join(', ')}]</p>
                    <p><strong>P:</strong> {evo.soapData.plan}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="studies" className="p-4 space-y-3">
            {medicalRecord.studies.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin estudios cargados.</p>
            ) : (
              medicalRecord.studies.map((study) => (
                <Card key={study.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{study.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(study.uploadedAt).toLocaleDateString('es-AR')}</p>
                    </div>
                    <button
                      className="text-xs text-blue-600 hover:underline"
                      onClick={async () => {
                        const { data } = await api.get<{ url: string }>(`/studies/${study.id}/download-url`);
                        window.open(data.url, '_blank');
                      }}
                    >
                      Ver
                    </button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
