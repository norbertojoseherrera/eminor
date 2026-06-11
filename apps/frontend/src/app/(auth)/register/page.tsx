'use client';

import { useState } from 'react';
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
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*\d)/, 'Debe incluir mayúscula y número'),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  documentType: z.enum(['DNI', 'PASAPORTE']),
  dni: z.string().regex(/^[A-Za-z0-9]{6,20}$/, 'Documento inválido'),
  phone: z.string().regex(/^\+?[\d\s-]{8,20}$/, 'Teléfono inválido'),
  birthDate: z.string().min(1, 'Requerido'),
  medicalInsurance: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await registerUser(data);
      toast.success('Cuenta creada exitosamente');
      router.push('/patient/appointments');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(typeof msg === 'string' ? msg : 'Error al registrarse');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-primary items-center justify-center text-white text-xl font-bold shadow-lg mb-3">
            E
          </div>
          <h1 className="text-xl font-bold text-foreground">Crear cuenta</h1>
          <p className="text-sm text-muted-foreground">Registro de paciente en EMINOR</p>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground/70">Nombre</Label>
                <Input {...register('firstName')} placeholder="Ana" className="h-10 rounded-xl text-sm" />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground/70">Apellido</Label>
                <Input {...register('lastName')} placeholder="López" className="h-10 rounded-xl text-sm" />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground/70">Email</Label>
              <Input type="email" {...register('email')} placeholder="correo@ejemplo.com" className="h-10 rounded-xl text-sm" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground/70">Contraseña</Label>
              <Input type="password" {...register('password')} className="h-10 rounded-xl text-sm" />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground/70">Tipo doc.</Label>
                <select {...register('documentType')} defaultValue="DNI" className="h-10 w-full rounded-xl border border-input bg-background px-2 text-sm">
                  <option value="DNI">DNI</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-medium text-foreground/70">Número de documento</Label>
                <Input {...register('dni')} placeholder="12345678" className="h-10 rounded-xl text-sm" />
                {errors.dni && <p className="text-xs text-destructive">{errors.dni.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground/70">Teléfono</Label>
                <Input {...register('phone')} placeholder="11 1234-5678" className="h-10 rounded-xl text-sm" />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground/70">Nacimiento</Label>
                <Input type="date" {...register('birthDate')} className="h-10 rounded-xl text-sm" />
                {errors.birthDate && <p className="text-xs text-destructive">{errors.birthDate.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground/70">Obra social <span className="text-muted-foreground/60">(opcional)</span></Label>
              <Input {...register('medicalInsurance')} placeholder="OSDE, Swiss Medical..." className="h-10 rounded-xl text-sm" />
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 font-medium mt-2"
              disabled={loading}
            >
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-5">
            ¿Ya tenés cuenta?{' '}
            <a href="/login" className="text-primary font-medium hover:underline">Ingresar</a>
          </p>
        </div>
      </div>
    </div>
  );
}
