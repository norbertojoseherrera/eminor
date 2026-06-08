import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Dashboard Admin', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('muestra tabla de usuarios con columnas correctas', async ({ page }) => {
    await expect(page.locator('text=Gestión de Usuarios')).toBeVisible();
    await expect(page.locator('th:has-text("Email")')).toBeVisible();
    await expect(page.locator('th:has-text("Rol")')).toBeVisible();
    await expect(page.locator('th:has-text("Estado")')).toBeVisible();
  });

  test('navega a Audit Logs', async ({ page }) => {
    await page.locator('text=Audit Logs').click();
    await expect(page).toHaveURL(/\/admin\/audit-logs/);
    await expect(page.locator('th:has-text("Acción")')).toBeVisible();
    await expect(page.locator('th:has-text("IP")')).toBeVisible();
  });

  test('navega a Estadísticas', async ({ page }) => {
    await page.locator('text=Estadísticas').click();
    await expect(page).toHaveURL(/\/admin\/stats/);
    await expect(page.locator('text=Total Usuarios')).toBeVisible();
    await expect(page.locator('text=Médicos')).toBeVisible();
    await expect(page.locator('text=Pacientes')).toBeVisible();
  });

  test('sidebar admin NO muestra opciones clínicas', async ({ page }) => {
    await expect(page.locator('text=Mis Turnos')).not.toBeVisible();
    await expect(page.locator('text=Mi Historia Clínica')).not.toBeVisible();
    await expect(page.locator('text=Agenda del Día')).not.toBeVisible();
  });
});

test.describe('RBAC — acceso cruzado de roles', () => {
  test('paciente no puede acceder a /admin/users', async ({ page }) => {
    await loginAs(page, 'patient');
    await page.goto('/admin/users');
    // Debe redirigir o mostrar página vacía (client-side guard)
    await page.waitForTimeout(3000);
    // El DashboardLayout redirige a /login si no hay sesión del rol correcto
    // o queda en /patient si hay guard client-side
    const url = page.url();
    expect(url).not.toContain('/admin/users');
  });

  test('médico no puede acceder a /admin/stats', async ({ page }) => {
    await loginAs(page, 'doctor');
    await page.goto('/admin/stats');
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).not.toContain('/admin/stats');
  });
});
