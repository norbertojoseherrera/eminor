import { Page } from '@playwright/test';

export async function loginAs(page: Page, role: 'patient' | 'doctor' | 'admin') {
  const creds = {
    patient: { email: 'alopez@eminor.com', password: 'Patient1234!', path: '/patient/appointments' },
    doctor:  { email: 'rsanchez@eminor.com', password: 'Doctor1234!',  path: '/doctor/schedule' },
    admin:   { email: 'admin@eminor.com',    password: 'Admin1234!',   path: '/admin/users' },
  }[role];

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.locator('#email').fill(creds.email);
  await page.locator('#password').fill(creds.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(`**${creds.path}`, { timeout: 10_000 });
}

export async function logout(page: Page) {
  await page.locator('text=Cerrar sesión').click();
  await page.waitForURL('**/login', { timeout: 5_000 });
}
