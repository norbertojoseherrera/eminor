'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Appointment } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  WAITING: 'Sala de Espera',
  ACTIVE: 'En Curso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  WAITING: 'default',
  ACTIVE: 'default',
  COMPLETED: 'outline',
  CANCELLED: 'destructive',
};

export default function PatientAppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Appointment[]>('/appointments/my')
      .then((r) => setAppointments(r.data))
      .catch(() => toast.error('Error al cargar turnos'))
      .finally(() => setLoading(false));
  }, []);

  const joinWaitingRoom = async (appt: Appointment) => {
    try {
      await api.patch(`/appointments/${appt.id}/status`, { status: 'WAITING' });
      toast.success('Ingresando a sala de espera...');
      router.push(`/consultation/${appt.id}`);
    } catch {
      toast.error('No se pudo ingresar a la sala de espera');
    }
  };

  if (loading) return <div className="p-8 text-center">Cargando turnos...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Mis Turnos</h1>
        <p className="text-muted-foreground">Gestión de tus consultas médicas</p>
      </div>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No tenés turnos agendados.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => (
            <Card key={appt.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {appt.doctor?.specialty ?? 'Consulta médica'}
                  </CardTitle>
                  <Badge variant={STATUS_COLORS[appt.status]}>
                    {STATUS_LABELS[appt.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {new Date(appt.scheduledAt).toLocaleString('es-AR', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })}
                </p>
                {appt.doctor && (
                  <p className="text-sm mt-1">Matrícula: {appt.doctor.licenseNumber}</p>
                )}
                {appt.status === 'PENDING' && (
                  <Button
                    className="mt-3"
                    size="sm"
                    onClick={() => joinWaitingRoom(appt)}
                  >
                    Ingresar a sala de espera
                  </Button>
                )}
                {appt.status === 'ACTIVE' && (
                  <Button
                    className="mt-3"
                    size="sm"
                    onClick={() => router.push(`/consultation/${appt.id}`)}
                  >
                    Unirse a la consulta
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
