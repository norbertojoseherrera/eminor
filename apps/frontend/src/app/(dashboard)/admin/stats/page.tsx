'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Stats {
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  appointmentsByStatus: Array<{ status: string; count: number }>;
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get<Stats>('/admin/stats')
      .then((r) => setStats(r.data))
      .catch(() => toast.error('Error al cargar estadísticas'));
  }, []);

  if (!stats) return <div className="p-8 text-center">Cargando estadísticas...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Estadísticas</h1>
        <p className="text-muted-foreground">Panel de métricas del sistema</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Usuarios</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.totalUsers}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Médicos</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.totalDoctors}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pacientes</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{stats.totalPatients}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Turnos por Estado</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {stats.appointmentsByStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium">{item.status}</span>
                <span className="text-2xl font-bold">{item.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
