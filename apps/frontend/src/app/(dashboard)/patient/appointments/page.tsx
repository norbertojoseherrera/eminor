'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Appointment } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente', WAITING: 'En Espera', ACTIVE: 'En Curso',
  COMPLETED: 'Completado', CANCELLED: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-amber-100 text-amber-800 border-amber-200',
  WAITING:   'bg-blue-100 text-blue-800 border-blue-200',
  ACTIVE:    'bg-emerald-100 text-emerald-800 border-emerald-200',
  COMPLETED: 'bg-stone-100 text-stone-600 border-stone-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
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

  const joinWaiting = async (appt: Appointment) => {
    try {
      await api.patch(`/appointments/${appt.id}/status`, { status: 'WAITING' });
      toast.success('Ingresando a sala de espera...');
      router.push(`/consultation/${appt.id}`);
    } catch {
      toast.error('No se pudo ingresar a la sala de espera');
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Mis Turnos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gestión de tus consultas médicas</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-4xl mb-3">🗓️</div>
          <p className="font-medium">No tenés turnos agendados</p>
          <p className="text-sm mt-1">Contactá a tu médico para agendar una consulta</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <div key={appt.id} className="bg-card rounded-2xl border border-border/60 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold text-foreground">{appt.doctor?.specialty ?? 'Consulta médica'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Mat. {appt.doctor?.licenseNumber}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_COLORS[appt.status]}`}>
                  {STATUS_LABELS[appt.status]}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <span>📅</span>
                <span>{new Date(appt.scheduledAt).toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' })}</span>
              </div>

              {appt.status === 'PENDING' && (
                <Button size="sm" onClick={() => joinWaiting(appt)}
                  className="w-full sm:w-auto rounded-xl bg-primary hover:bg-primary/90 text-xs h-9">
                  Ingresar a sala de espera
                </Button>
              )}
              {appt.status === 'ACTIVE' && (
                <Button size="sm" onClick={() => router.push(`/consultation/${appt.id}`)}
                  className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs h-9">
                  Unirse a la consulta
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
