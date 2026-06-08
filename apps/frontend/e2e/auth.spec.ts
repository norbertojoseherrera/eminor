import { test, expect } from '@playwright/test';
import { loginAs, logout } from './helpers';

test.describe('Autenticación', () => {
  test('login de paciente redirige a /patient/appointments', async ({ page }) => {
    await loginAs(page, 'patient');
    await expect(page).toHaveURL(/\/patient\/appointments/);
    await expect(page.locator('text=Mis Turnos')).toBeVisible();
  });

  test('login de médico redirige a /doctor/schedule', async ({ page }) => {
    await loginAs(page, 'doctor');
    await expect(page).toHaveURL(/\/doctor\/schedule/);
    await expect(page.locator('text=Agenda del Día')).toBeVisible();
  });

  test('login de admin redirige a /admin/users', async ({ page }) => {
    await loginAs(page, 'admin');
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.locator('text=Gestión de Usuarios')).toBeVisible();
  });

  test('credenciales incorrectas muestra error', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.locator('#email').fill('paciente@eminor.com');
    await page.locator('#password').fill('WrongPass1!');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);

    // Debe quedarse en /login con mensaje de error
    await expect(page).toHaveURL(/\/login/);
  });

  test('acceso directo a /patient/appointments sin sesión redirige a /login', async ({ page }) => {
    await page.goto('/patient/appointments');
    await page.waitForURL(/\/login/, { timeout: 5_000 });
    await expect(page.locator('text=EMINOR')).toBeVisible();
  });

  test('cerrar sesión redirige a /login', async ({ page }) => {
    await loginAs(page, 'patient');
    await logout(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test('sidebar muestra rol correcto para paciente', async ({ page }) => {
    await loginAs(page, 'patient');
    await expect(page.locator('text=PATIENT')).toBeVisible();
    await expect(page.locator('text=paciente@eminor.com')).toBeVisible();
  });

  test('sidebar de médico no muestra opciones de paciente', async ({ page }) => {
    await loginAs(page, 'doctor');
    await expect(page.locator('text=Mis Turnos')).not.toBeVisible();
    await expect(page.locator('text=Mis Estudios')).not.toBeVisible();
    await expect(page.locator('text=Agenda del Día')).toBeVisible();
  });
});
