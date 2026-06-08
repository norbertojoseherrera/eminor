import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EMINOR — Plataforma de Telemedicina',
  description: 'Sistema integral de telemedicina EMINOR',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={geist.className}>
      <body className="min-h-screen bg-background antialiased">
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
