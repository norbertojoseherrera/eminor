'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Appointment, AppointmentStatus, Doctor } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente', WAITING: 'En Espera', ACTIVE: 'En Curso',
  COMPLETED: 'Completado', CANCELLED: 'Cancelado',
};

const STATUS_OPTIONS: AppointmentStatus[] = ['PENDING', 'WAITING', 'ACTIVE', 'COMPLETED', 'CANCELLED'];

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-amber-100 text-amber-800 border-amber-200',
  WAITING:   'bg-blue-100 text-blue-800 border-blue-200',
  ACTIVE:    'bg-emerald-100 text-emerald-800 border-emerald-200',
  COMPLETED: 'bg-stone-100 text-stone-600 border-stone-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
};

const PAGE_SIZE = 20;

interface EditState {
  id: string;
  date: string;
  time: string;
  notes: string;
  doctorId: string;
  status: AppointmentStatus;
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<{ appointments: Appointment[]; total: number }>('/appointments/admin/all', {
      params: { page, limit: PAGE_SIZE, status: statusFilter || undefined },
    })
      .then((r) => { setAppointments(r.data.appointments); setTotal(r.data.total); })
      .catch(() => toast.error('Error al cargar turnos'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, statusFilter]);

  useEffect(() => {
    api.get<Doctor[]>('/doctors').then((r) => setDoctors(r.data)).catch(() => {});
  }, []);

  const openEdit = (appt: Appointment) => {
    const dt = new Date(appt.scheduledAt);
    const date = dt.toISOString().split('T')[0];
    const time = dt.toTimeString().slice(0, 5);
    setEdit({ id: appt.id, date, time, notes: appt.notes ?? '', doctorId: appt.doctorId, status: appt.status });
  };

  const save = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      const original = appointments.find((a) => a.id === edit.id);
      const scheduledAt = new Date(`${edit.date}T${edit.time}:00`).toISOString();

      await api.patch(`/appointments/${edit.id}`, {
        scheduledAt,
        notes: edit.notes,
        doctorId: edit.doctorId,
      });

      if (original && original.status !== edit.status) {
        await api.patch(`/appointments/${edit.id}/status`, { status: edit.status });
      }

      toast.success('Turno actualizado');
      setEdit(null);
      load();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(typeof message === 'string' ? message : 'No se pudo actualizar el turno');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este turno definitivamente?')) return;
    try {
      await api.delete(`/appointments/${id}`);
      toast.success('Turno eliminado');
      load();
    } catch {
      toast.error('No se pudo eliminar el turno (puede tener historia clínica asociada)');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Gestión de Turnos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} turnos registrados</p>
        </div>

        <Select value={statusFilter || 'ALL'} onValueChange={(v) => { setStatusFilter(v === 'ALL' ? '' : (v as string)); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por estado">
              {(value: string) => value === 'ALL' ? 'Todos los estados' : (STATUS_LABELS[value] ?? 'Filtrar por estado')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los estados</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 rounded-2xl bg-muted animate-pulse" />)}</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha y hora</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Médico</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appt) => (
                  <TableRow key={appt.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(appt.scheduledAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {appt.patient ? `${appt.patient.firstName} ${appt.patient.lastName}` : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {appt.doctor ? `${appt.doctor.firstName ?? ''} ${appt.doctor.lastName ?? ''}`.trim() : '—'}
                      <span className="block text-xs text-muted-foreground">{appt.doctor?.specialty}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_COLORS[appt.status]}`}>
                        {STATUS_LABELS[appt.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(appt)} className="text-xs h-8 rounded-xl">
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(appt.id)} className="text-xs h-8 rounded-xl text-destructive hover:text-destructive">
                        Eliminar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl text-xs h-8">
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-xl text-xs h-8">
              Siguiente
            </Button>
          </div>
        </>
      )}

      <Dialog open={!!edit} onOpenChange={(open) => !open && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar turno</DialogTitle>
          </DialogHeader>

          {edit && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} className="rounded-xl text-sm" />
                <Input type="time" value={edit.time} onChange={(e) => setEdit({ ...edit, time: e.target.value })} className="rounded-xl text-sm" />
              </div>

              <Select value={edit.doctorId} onValueChange={(v) => setEdit({ ...edit, doctorId: v as string })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Médico">
                    {(value: string) => {
                      const d = doctors.find((x) => x.id === value);
                      return d ? `${d.firstName} ${d.lastName} — ${d.specialty}` : 'Médico';
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.firstName} {d.lastName} — {d.specialty}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={edit.status} onValueChange={(v) => setEdit({ ...edit, status: v as AppointmentStatus })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Estado">
                    {(value: AppointmentStatus) => STATUS_LABELS[value] ?? 'Estado'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Textarea value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} maxLength={500} placeholder="Notas" className="rounded-xl" />
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
            <Button onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
