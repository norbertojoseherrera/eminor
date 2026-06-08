'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';

interface UserRow { id: string; email: string; role: string; isActive: boolean; createdAt: string; }

const ROLE_LABELS: Record<string, string> = { ADMIN: 'Admin', DOCTOR: 'Médico', PATIENT: 'Paciente' };
const ROLE_COLORS: Record<string, string> = {
  ADMIN:   'bg-purple-100 text-purple-800 border-purple-200',
  DOCTOR:  'bg-blue-100 text-blue-800 border-blue-200',
  PATIENT: 'bg-amber-100 text-amber-800 border-amber-200',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    api.get<{ users: UserRow[] }>('/admin/users')
      .then((r) => setUsers(r.data.users))
      .catch(() => toast.error('Error al cargar usuarios'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  const toggle = async (userId: string) => {
    try {
      await api.patch(`/admin/users/${userId}/toggle-active`);
      toast.success('Estado actualizado');
      fetch();
    } catch { toast.error('Error al actualizar'); }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Gestión de Usuarios</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{users.length} usuarios registrados</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="bg-card rounded-2xl border border-border/60 p-4 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{u.email}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(u.createdAt).toLocaleDateString('es-AR')}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${ROLE_COLORS[u.role]}`}>
                  {ROLE_LABELS[u.role]}
                </span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${u.isActive ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-stone-100 text-stone-500 border-stone-200'}`}>
                  {u.isActive ? 'Activo' : 'Inactivo'}
                </span>
                <Button variant="ghost" size="sm" onClick={() => toggle(u.id)}
                  className="text-xs h-8 rounded-xl hover:bg-muted">
                  {u.isActive ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
