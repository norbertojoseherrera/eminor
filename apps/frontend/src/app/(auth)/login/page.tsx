'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, user } = useAuth();
  const [loading, setLoading] = useState(false);

  const roleRedirect = (role: string) => {
    if (role === 'DOCTOR') return '/doctor/schedule';
    if (role === 'ADMIN')  return '/admin/users';
    return '/patient/appointments';
  };

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (user) router.replace(roleRedirect(user.role));
  }, [user, router]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('Bienvenido a EMINOR');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(typeof msg === 'string' ? msg : 'Credenciales inválidas');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-primary items-center justify-center text-white text-2xl font-bold shadow-lg mb-4">
            E
          </div>
          <h1 className="text-2xl font-bold text-foreground">EMINOR</h1>
          <p className="text-sm text-muted-foreground mt-1">Plataforma de Telemedicina</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-foreground/80">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                className="h-11 rounded-xl border-border/70 bg-background focus:border-primary"
                {...register('email')}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-foreground/80">Contraseña</Label>
              <Input
                id="password"
                type="password"
                className="h-11 rounded-xl border-border/70 bg-background focus:border-primary"
                {...register('password')}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm transition-all"
              disabled={loading}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            ¿No tenés cuenta?{' '}
            <a href="/register" className="text-primary font-medium hover:underline">Registrate</a>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          Cumplimiento Ley 26.529 · Ley 27.553
        </p>
      </div>
    </div>
  );
}
