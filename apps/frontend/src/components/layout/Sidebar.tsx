'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const patientNav = [
  { href: '/patient/appointments', label: 'Mis Turnos',         icon: '🗓️' },
  { href: '/patient/medical-record', label: 'Historia Clínica', icon: '📋' },
  { href: '/patient/studies',      label: 'Mis Estudios',       icon: '📎' },
  { href: '/patient/prescriptions', label: 'Mis Recetas',       icon: '💊' },
  { href: '/patient/certificates', label: 'Mis Certificados',  icon: '📜' },
];

const doctorNav = [
  { href: '/doctor/schedule',     label: 'Agenda del Día',   icon: '📅' },
  { href: '/doctor/patients',     label: 'Mis Pacientes',    icon: '👥' },
  { href: '/doctor/availability', label: 'Disponibilidad',   icon: '🕐' },
];

const adminNav = [
  { href: '/admin/users',       label: 'Usuarios',        icon: '👤' },
  { href: '/admin/appointments', label: 'Turnos',         icon: '🗓️' },
  { href: '/admin/audit-logs',  label: 'Audit Logs',      icon: '🔍' },
  { href: '/admin/stats',       label: 'Estadísticas',    icon: '📊' },
];

function RoleBadge({ role }: { role: string }) {
  const labels: Record<string, string> = {
    PATIENT: 'Paciente',
    DOCTOR: 'Médico',
    ADMIN: 'Administrador',
  };
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary-foreground/80">
      {labels[role] ?? role}
    </span>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems =
    user?.role === 'DOCTOR' ? doctorNav :
    user?.role === 'ADMIN'  ? adminNav  : patientNav;

  const handleLogout = async () => {
    await logout();
    toast.success('Sesión cerrada');
    router.push('/login');
  };

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150',
            pathname === item.href
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
          )}
        >
          <span className="text-base">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </>
  );

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 bg-sidebar min-h-screen shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm shadow-sm">
              E
            </div>
            <div>
              <p className="font-semibold text-sidebar-foreground text-sm">EMINOR</p>
              <RoleBadge role={user?.role ?? ''} />
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          <NavLinks />
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/50 mb-2 truncate">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground px-4 py-2.5 rounded-xl hover:bg-sidebar-accent transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs shadow-sm">
            E
          </div>
          <span className="font-semibold text-sidebar-foreground text-sm">EMINOR</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="text-sidebar-foreground/70 hover:text-sidebar-foreground p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
          aria-label="Abrir menú"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* ── Mobile drawer overlay ───────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-72 bg-sidebar flex flex-col h-full shadow-2xl">
            <div className="px-5 py-4 border-b border-sidebar-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-sm">
                  E
                </div>
                <div>
                  <p className="font-semibold text-sidebar-foreground text-sm">EMINOR</p>
                  <RoleBadge role={user?.role ?? ''} />
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-sidebar-foreground/60 hover:text-sidebar-foreground p-1.5 rounded-lg hover:bg-sidebar-accent"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </nav>

            <div className="p-4 border-t border-sidebar-border">
              <p className="text-xs text-sidebar-foreground/50 mb-2 truncate">{user?.email}</p>
              <button
                onClick={() => { setMobileOpen(false); handleLogout(); }}
                className="w-full text-left text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground px-4 py-2.5 rounded-xl hover:bg-sidebar-accent transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Mobile bottom navigation ────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar border-t border-sidebar-border px-2 py-2 flex justify-around">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-150 min-w-0 flex-1',
              pathname === item.href
                ? 'bg-primary/15 text-primary'
                : 'text-sidebar-foreground/50 hover:text-sidebar-foreground',
            )}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="text-[10px] font-medium truncate w-full text-center leading-tight">
              {item.label.split(' ')[0]}
            </span>
          </Link>
        ))}
      </nav>
    </>
  );
}
