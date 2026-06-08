'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Appointment } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  WAITING: 'default',
  ACTIVE: 'default',
  COMPLETED: 'outline',
  CANCELLED: 'destructive',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  WAITING: 'En Espera',
  ACTIVE: 'En Curso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

export default function DoctorSchedulePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const doctorId = user?.doctor?.id;

  const fetchAppointments = () => {
    if (!doctorId) return;
    setLoading(true);
    api.get<Appointment[]>(`/appointments?doctorId=${doctorId}&date=${date}`)
      .then((r) => setAppointments(r.data))
      .catch(() => toast.error('Error al cargar agenda'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAppointments();
  }, [doctorId, date]);

  const startConsultation = async (appt: Appointment) => {
    try {
      await api.patch(`/appointments/${appt.id}/status`, { status: 'ACTIVE' });
      router.push(`/doctor/consultation/${appt.id}`);
    } catch {
      toast.error('No se pudo iniciar la consulta');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Agenda del Día</h1>
          <p className="text-muted-foreground">Dr. {user?.doctor?.specialty}</p>
        </div>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-auto"
        />
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-12">Cargando agenda...</p>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay turnos para el {new Date(date + 'T00:00:00').toLocaleDateString('es-AR')}.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => (
            <Card key={appt.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {appt.patient?.firstName} {appt.patient?.lastName}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      — DNI {appt.patient?.dni}
                    </span>
                  </CardTitle>
                  <Badge variant={STATUS_COLORS[appt.status]}>{STATUS_LABELS[appt.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {new Date(appt.scheduledAt).toLocaleTimeString('es-AR', { timeStyle: 'short' })} hs
                </p>
                {(appt.status === 'WAITING' || appt.status === 'PENDING') && (
                  <Button className="mt-3" size="sm" onClick={() => startConsultation(appt)}>
                    Iniciar consulta
                  </Button>
                )}
                {appt.status === 'ACTIVE' && (
                  <Button className="mt-3" size="sm" onClick={() => router.push(`/doctor/consultation/${appt.id}`)}>
                    Continuar consulta
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
