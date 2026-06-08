import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Dashboard Paciente', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'patient');
  });

  test('muestra "Mis Turnos" con turno de prueba', async ({ page }) => {
    await expect(page.locator('text=Medicina General')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Pendiente')).toBeVisible();
    await expect(page.locator('text=Ingresar a sala de espera')).toBeVisible();
  });

  test('navega a Mis Estudios', async ({ page }) => {
    await page.locator('text=Mis Estudios').click();
    await expect(page).toHaveURL(/\/patient\/studies/);
    await expect(page.locator('text=Subir nuevo estudio')).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeAttached();
  });

  test('navega a Mi Historia Clínica', async ({ page }) => {
    await page.locator('text=Mi Historia Clínica').click();
    await expect(page).toHaveURL(/\/patient\/medical-record/);
    await expect(page.locator('text=Evoluciones')).toBeVisible();
    await expect(page.locator('text=Estudios')).toBeVisible();
  });

  test('navega a Mis Recetas', async ({ page }) => {
    await page.locator('text=Mis Recetas').click();
    await expect(page).toHaveURL(/\/patient\/prescriptions/);
    await expect(page.locator('text=Mis Recetas')).toBeVisible();
  });

  test('subir archivo con título vacío muestra error toast', async ({ page }) => {
    await page.locator('text=Mis Estudios').click();
    await page.locator('button:has-text("Subir estudio")').click();
    await expect(page.locator('text=Completá el título')).toBeVisible({ timeout: 3000 });
  });
});
