#!/bin/bash
# Script de inicio rápido para desarrollo local EMINOR

set -e

echo "=== EMINOR — Inicio de entorno de desarrollo ==="
echo ""

# 1. Levantar PostgreSQL
echo "1. Levantando PostgreSQL con Docker..."
docker-compose up -d db
echo "   Esperando que PostgreSQL esté listo..."
until docker-compose exec -T db pg_isready -U eminor 2>/dev/null; do
  sleep 1
done
echo "   ✓ PostgreSQL listo"

# 2. Migraciones
echo ""
echo "2. Ejecutando migraciones de base de datos..."
cd apps/backend
npx prisma migrate dev --name init 2>/dev/null || npx prisma migrate deploy
echo "   ✓ Migraciones aplicadas"

# 3. Seed
echo ""
echo "3. Cargando datos de prueba..."
npm run db:seed || echo "   (Seed ya ejecutado anteriormente)"
echo ""

echo "=== Credenciales de prueba ==="
echo "  Admin:   admin@eminor.com    / Admin1234!"
echo "  Doctor:  doctor@eminor.com   / Doctor1234!"
echo "  Patient: paciente@eminor.com / Patient1234!"
echo ""
echo "=== Para iniciar los servidores, ejecutar en terminales separadas: ==="
echo "  Backend:  cd apps/backend && npm run start:dev"
echo "  Frontend: cd apps/frontend && npm run dev"
echo ""
echo "  Backend:  http://localhost:3001/api/health"
echo "  Frontend: http://localhost:3000"
