# Plan de Pruebas EMINOR

## Cómo correr las pruebas automáticas

### Tests unitarios (backend)
```bash
cd apps/backend
npm run test                    # todos los unit tests
npm run test -- --watchAll      # modo watch
npm run test -- --coverage      # con reporte de cobertura
```

### Tests e2e (backend — requiere DB de prueba)
```bash
cd apps/backend
DATABASE_URL=postgresql://eminor:eminor_dev@localhost:5433/eminor_test \
  npm run test:e2e
```

### Tests e2e (frontend — requiere servidores corriendo)
```bash
# Terminal 1: backend
cd apps/backend && DATABASE_URL=... npm run start:dev

# Terminal 2: frontend
cd apps/frontend && npm run dev

# Terminal 3: tests
cd apps/frontend && npx playwright test
cd apps/frontend && npx playwright test --ui   # modo visual
```

---

## Checklist de Pruebas Manuales

### 1. AUTENTICACIÓN

| # | Caso | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| 1.1 | Login paciente | Email: paciente@eminor.com / Patient1234! | Redirige a /patient/appointments, sidebar muestra PATIENT |
| 1.2 | Login médico | Email: doctor@eminor.com / Doctor1234! | Redirige a /doctor/schedule, sidebar muestra DOCTOR |
| 1.3 | Login admin | Email: admin@eminor.com / Admin1234! | Redirige a /admin/users, sidebar muestra ADMIN |
| 1.4 | Contraseña incorrecta | Login con pass erróneo | Toast de error, permanece en /login |
| 1.5 | Email inexistente | Login con email falso | Toast de error "credenciales inválidas" |
| 1.6 | Registro con email duplicado | Registrar mismo email dos veces | Error 409, toast de "Email ya registrado" |
| 1.7 | Registro con DNI inválido | DNI con letras o menos de 7 dígitos | Error de validación en campo DNI |
| 1.8 | Contraseña débil | Password sin mayúscula o número | Error de validación en campo contraseña |
| 1.9 | Cerrar sesión | Click "Cerrar sesión" | Redirige a /login, cookies eliminadas |
| 1.10 | Acceso sin sesión | URL directa /patient/appointments sin login | Redirige a /login |
| 1.11 | Acceso cruzado paciente→admin | Paciente intenta /admin/users | Redirige o muestra error 403 |
| 1.12 | Token expirado | Esperar 15 min de inactividad | Auto-refresh transparente o redirect a login |

---

### 2. TURNOS

| # | Caso | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| 2.1 | Crear turno vía API | POST /api/appointments con admin | Status 201, roomUuid generado, estado PENDING |
| 2.2 | Paciente ve su turno | Login paciente → Mis Turnos | Turno aparece con especialidad, horario y estado |
| 2.3 | Médico ve agenda del día | Login médico → Agenda | Paciente nombre + DNI visible, botón "Iniciar consulta" |
| 2.4 | Cambiar fecha en agenda | Selector de fecha → fecha futura | "No hay turnos para esa fecha" |
| 2.5 | Paciente ingresa sala de espera | Click "Ingresar a sala de espera" | Estado pasa a WAITING, redirige a /consultation/[id] |
| 2.6 | Transición inválida | PATCH status PENDING→COMPLETED | Error 400 |
| 2.7 | Médico inicia consulta | Click "Iniciar consulta" desde agenda | Estado → ACTIVE, redirige a split-screen |
| 2.8 | Usuario ajeno intenta video token | Token GET de otro usuario | Error 403 |
| 2.9 | Turno no existe | GET /api/appointments/fake-uuid/video-token | Error 404 |

---

### 3. VIDEOCONSULTA

| # | Caso | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| 3.1 | Split-screen se carga | Médico inicia consulta | Lado izquierdo: frame Jitsi; lado derecho: tabs SOAP/HCE/Estudios |
| 3.2 | Tab Historial muestra evoluciones previas | Consulta de paciente con historial | Lista de evoluciones en orden cronológico descendente |
| 3.3 | Tab Estudios muestra archivos | Paciente tiene estudios previos | Lista de estudios con botón "Ver" |
| 3.4 | Botón "Finalizar" completa el turno | Click Finalizar | Estado → COMPLETED, redirige a /doctor/schedule |
| 3.5 | Consulta en turno CANCELLED | Intentar video token | Error 400 "appointment is not active" |

---

### 4. HISTORIA CLÍNICA ELECTRÓNICA (HCE) — Ley 26.529

| # | Caso | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| 4.1 | Médico crea evolución SOAP | Formulario SOAP completo → Guardar | Status 201, isSigned: false |
| 4.2 | Campos SOAP vacíos | Intentar guardar sin completar | Errores de validación por campo |
| 4.3 | Código CIE-10 inválido | Código "ZZZZZ" → + CIE-10 | Toast de error, no se agrega |
| 4.4 | Código CIE-10 válido | "J18.9" → + CIE-10 | Badge agregado al listado |
| 4.5 | Firmar evolución | Botón "Firmar y cerrar" | isSigned: true, soapData._signatureHash de 64 chars |
| 4.6 | Firmar segunda vez | PATCH /evolutions/:id/sign en firmada | Error 409 |
| 4.7 | Editar evolución firmada | PATCH /evolutions/:id en firmada | Error 403 |
| 4.8 | Médico accede a HCE propia | Paciente con turno asignado | 200, evoluciones visibles |
| 4.9 | Médico sin turno previo | Médico ajeno intenta HCE | Error 403 |
| 4.10 | Paciente ve su HCE | /patient/medical-record | Evoluciones + estudios visibles |
| 4.11 | Paciente ve HCE de otro | GET /patients/otro-id/medical-record | Error 403 |
| 4.12 | Admin no puede ver HCE | Admin GET /patients/:id/medical-record | Error 403 |

---

### 5. ESTUDIOS MÉDICOS

| # | Caso | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| 5.1 | Upload sin título | Click "Subir estudio" sin título | Toast de error |
| 5.2 | Upload sin archivo | Click "Subir estudio" sin seleccionar archivo | Toast de error |
| 5.3 | Upload PDF válido | Título + PDF → Subir | Presigned URL generada, PUT a R2, estudio listado |
| 5.4 | Upload tipo inválido | Archivo .exe | Toast de error tipo no permitido |
| 5.5 | Descarga de estudio | Click "Descargar" en estudio | URL firmada de 15 min abierta en nueva pestaña |
| 5.6 | Médico ve estudios de su paciente | Tab Estudios en consulta | Lista de estudios con botón Ver |
| 5.7 | Médico sin turno accede a estudios | GET /studies/patient/:id de paciente ajeno | Error 403 |
| 5.8 | Admin intenta crear presigned URL | POST /api/studies/presigned-url con admin | Error 403 |

---

### 6. RECETAS — Ley 27.553

| # | Caso | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| 6.1 | Crear receta en turno ACTIVE | POST /api/prescriptions | Error 400 (turno debe estar COMPLETED) |
| 6.2 | Crear receta en turno COMPLETED | POST /api/prescriptions | 201, digitalSignatureHash de 64 chars |
| 6.3 | Médico ajeno crea receta | POST con doctor que no atendió | Error 403 |
| 6.4 | Paciente ve sus recetas | /patient/prescriptions | Medicamentos listados con dosis y duración |
| 6.5 | Hash de firma es único | Dos recetas del mismo médico | Hashes diferentes (timestamp distinto) |
| 6.6 | Payload inválido | medications array vacío | Error 400 |

---

### 7. ADMIN

| # | Caso | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| 7.1 | Crear médico | POST /admin/doctors con datos válidos | 201, rol DOCTOR, isVerified: true |
| 7.2 | Email duplicado en creación | Mismo email que usuario existente | Error 409 |
| 7.3 | Listar usuarios | GET /admin/users | Array paginado, sin passwordHash/refreshToken |
| 7.4 | Toggle usuario activo/inactivo | PATCH /admin/users/:id/toggle-active | isActive cambia; usuario inactivo no puede login |
| 7.5 | Audit logs no se pueden eliminar | DELETE /audit_logs (Postgres rule) | Operación bloqueada por regla SQL |
| 7.6 | Audit logs registran acciones críticas | Acceder a HCE, login, descarga | Nueva entrada en audit_logs con userId, IP, acción |
| 7.7 | Estadísticas retornan conteos reales | GET /admin/stats | totalUsers/Doctors/Patients > 0 |

---

### 8. SEGURIDAD

| # | Caso | Pasos | Resultado esperado |
|---|------|-------|--------------------|
| 8.1 | CORS bloqueado desde origen desconocido | curl con Origin: https://evil.com | access-control-allow-origin NO incluye evil.com |
| 8.2 | Cookie httpOnly | DevTools → Application → Cookies | access_token y refresh_token con HttpOnly flag |
| 8.3 | Cookie SameSite=None en prod | Inspeccionar Set-Cookie en producción | SameSite=None; Secure visible |
| 8.4 | JWT expirado | Esperar >15 min o manipular token | 401, refresh automático intenta renovar |
| 8.5 | Campos extra en request | Enviar campos no declarados en DTO | Ignorados (whitelist: true) sin error 400 |
| 8.6 | SQL injection en email | email: "' OR 1=1 --" | Error de validación (IsEmail), no error SQL |
| 8.7 | Rate limiting en login | 6+ intentos en 1 min | Error 429 Too Many Requests |
| 8.8 | Health sin autenticación | GET /api/health | 200 público (endpoint de monitoreo) |
| 8.9 | Sin token → rutas protegidas | GET /api/evolutions sin cookie | 401 |
| 8.10 | Token de rol incorrecto | Doctor intentando PATCH /admin/... | 403 Forbidden |

---

### 9. PRODUCCIÓN — Smoke Tests

Ejecutar contra https://eminor-telemedicina.vercel.app y https://eminor-api-production.up.railway.app

| # | Verificación | Comando/URL |
|---|--------------|------------|
| P.1 | API health | `curl https://eminor-api-production.up.railway.app/api/health` → `{"status":"ok","db":"connected"}` |
| P.2 | Frontend accesible | HTTP 200 en https://eminor-telemedicina.vercel.app/login |
| P.3 | Login paciente funciona | Email/pass → dashboard visible |
| P.4 | CORS correcto | Origin: vercel.app → access-control-allow-origin correcto |
| P.5 | Cookie flags en prod | SameSite=None; Secure; HttpOnly |
| P.6 | CSP no bloquea requests | Sin errores de CSP en DevTools |
| P.7 | DB conectada en Railway | Health endpoint → db: connected |

---

## Cobertura objetivo

| Módulo | Unit | E2E Backend | E2E Frontend |
|--------|------|-------------|--------------|
| Auth | ✅ | ✅ | ✅ |
| Appointments / estado | ✅ | ✅ | ✅ |
| Evolutions / HCE | ✅ | ✅ | ⚠️ (parcial) |
| Studies (R2) | — | — | ✅ (manual) |
| Prescriptions | — | — | ✅ (manual) |
| Admin / RBAC | ✅ | ✅ | ✅ |
| Seguridad (cookies/CORS) | — | — | ✅ (manual) |
