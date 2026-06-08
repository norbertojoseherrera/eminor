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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[A-Z])(?=.*\d)/, 'Debe incluir mayúscula y número'),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dni: z.string().regex(/^\d{7,8}$/, 'DNI: 7 u 8 dígitos'),
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
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al registrarse';
      toast.error(typeof msg === 'string' ? msg : 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">E</div>
          <CardTitle className="text-2xl">Crear cuenta</CardTitle>
          <CardDescription>Registro de paciente en EMINOR</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input {...register('firstName')} placeholder="Ana" />
                {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Apellido</Label>
                <Input {...register('lastName')} placeholder="López" />
                {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...register('email')} placeholder="correo@ejemplo.com" />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Contraseña</Label>
              <Input type="password" {...register('password')} />
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>DNI</Label>
                <Input {...register('dni')} placeholder="12345678" />
                {errors.dni && <p className="text-xs text-red-500">{errors.dni.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Fecha de nacimiento</Label>
                <Input type="date" {...register('birthDate')} />
                {errors.birthDate && <p className="text-xs text-red-500">{errors.birthDate.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Obra social (opcional)</Label>
              <Input {...register('medicalInsurance')} placeholder="OSDE, Swiss Medical, etc." />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              ¿Ya tenés cuenta?{' '}
              <a href="/login" className="text-blue-600 hover:underline">Ingresar</a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
