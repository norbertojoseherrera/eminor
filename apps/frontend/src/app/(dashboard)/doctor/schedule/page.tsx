'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Appointment } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-amber-100 text-amber-800 border-amber-200',
  WAITING:   'bg-blue-100 text-blue-800 border-blue-200',
  ACTIVE:    'bg-emerald-100 text-emerald-800 border-emerald-200',
  COMPLETED: 'bg-stone-100 text-stone-600 border-stone-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente', WAITING: 'En Espera', ACTIVE: 'En Curso',
  COMPLETED: 'Completado', CANCELLED: 'Cancelado',
};

export default function DoctorSchedulePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const doctorId = user?.doctor?.id;

  const fetch = () => {
    if (!doctorId) return;
    setLoading(true);
    api.get<Appointment[]>(`/appointments?doctorId=${doctorId}&date=${date}`)
      .then((r) => setAppointments(r.data))
      .catch(() => toast.error('Error al cargar agenda'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, [doctorId, date]);

  const start = async (appt: Appointment) => {
    try {
      await api.patch(`/appointments/${appt.id}/status`, { status: 'ACTIVE' });
      router.push(`/doctor/consultation/${appt.id}`);
    } catch { toast.error('No se pudo iniciar la consulta'); }
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Agenda del Día</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{user?.doctor?.specialty}</p>
        </div>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="w-full sm:w-44 h-10 rounded-xl text-sm" />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-4xl mb-3">📅</div>
          <p className="font-medium">No hay turnos para esta fecha</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <div key={appt.id} className="bg-card rounded-2xl border border-border/60 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="font-semibold text-foreground">
                    {appt.patient?.firstName} {appt.patient?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">DNI {appt.patient?.dni}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${STATUS_COLORS[appt.status]}`}>
                  {STATUS_LABELS[appt.status]}
                </span>
              </div>

              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-3">
                <span>🕐</span>
                {new Date(appt.scheduledAt).toLocaleTimeString('es-AR', { timeStyle: 'short' })} hs
              </p>

              {(appt.status === 'PENDING' || appt.status === 'WAITING') && (
                <Button size="sm" onClick={() => start(appt)}
                  className="w-full sm:w-auto rounded-xl bg-primary hover:bg-primary/90 text-xs h-9">
                  Iniciar consulta
                </Button>
              )}
              {appt.status === 'ACTIVE' && (
                <Button size="sm" onClick={() => router.push(`/doctor/consultation/${appt.id}`)}
                  className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs h-9">
                  Continuar consulta
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
