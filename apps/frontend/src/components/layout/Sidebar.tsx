'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const patientNav = [
  { href: '/patient/appointments', label: 'Mis Turnos' },
  { href: '/patient/medical-record', label: 'Mi Historia Clínica' },
  { href: '/patient/studies', label: 'Mis Estudios' },
  { href: '/patient/prescriptions', label: 'Mis Recetas' },
];

const doctorNav = [
  { href: '/doctor/schedule', label: 'Agenda del Día' },
  { href: '/doctor/patients', label: 'Mis Pacientes' },
];

const adminNav = [
  { href: '/admin/users', label: 'Usuarios' },
  { href: '/admin/audit-logs', label: 'Audit Logs' },
  { href: '/admin/stats', label: 'Estadísticas' },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const navItems =
    user?.role === 'DOCTOR' ? doctorNav :
    user?.role === 'ADMIN' ? adminNav :
    patientNav;

  const handleLogout = async () => {
    await logout();
    toast.success('Sesión cerrada');
    router.push('/login');
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white min-h-screen">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center font-bold text-sm">E</div>
          <div>
            <p className="font-semibold text-sm">EMINOR</p>
            <p className="text-xs text-slate-400">{user?.role}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'block px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === item.href
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-700">
        <p className="text-xs text-slate-400 mb-1 truncate">{user?.email}</p>
        <button
          onClick={handleLogout}
          className="w-full text-left text-sm text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
