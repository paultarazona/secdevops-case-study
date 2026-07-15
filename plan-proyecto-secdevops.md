# Plan de Proyecto: App Insegura (v1) vs App SecDevOps (v2)
**Curso:** Ciberseguridad
**Objetivo:** Construir dos versiones de la misma app para demostrar contraste entre desarrollo sin prácticas de seguridad y desarrollo con SecDevOps.

---

## 1. Alcance funcional (idéntico en v1 y v2)

- **Auth:** registro y login de usuarios
- **Archivos:** subida y descarga de archivos asociados a un usuario
- **CRUD de un recurso** (ej. "notas" o "documentos" del usuario): GET, POST, PUT/PATCH, DELETE

### Modelo de datos mínimo
```
users
  id, username, password_hash, created_at

resources (ej: "notes")
  id, user_id (FK), title, content, file_path, created_at, updated_at
```

### Endpoints (idénticos en ambas versiones, misma superficie de API)
```
POST   /api/auth/register
POST   /api/auth/login

GET    /api/resources          (lista recursos del usuario autenticado)
GET    /api/resources/:id      (detalle)
POST   /api/resources          (crear)
PUT    /api/resources/:id      (actualizar)
DELETE /api/resources/:id      (eliminar)

POST   /api/resources/:id/upload   (subir archivo adjunto)
GET    /api/resources/:id/file     (descargar archivo adjunto)
```

---

## 2. Stack técnico (definitivo)

| Componente | Elección |
|---|---|
| Backend | Node.js + Express |
| Base de datos | SQLite (`better-sqlite3`) |
| Auth | JWT |
| Contenedores | Docker (ambas versiones, imagen separada) |
| CI/CD | GitHub Actions |
| SAST | Semgrep |
| SCA | `npm audit` + Trivy (imagen Docker) |
| Secret scanning | gitleaks |
| DAST (opcional) | OWASP ZAP baseline scan |

**Nota sobre SQLite y git:** se versiona el script de esquema (`schema.sql`) y un script `seed.js` para poblar datos de prueba. El archivo `.db` generado va en `.gitignore` (no se versiona el binario).

---

## 2.1 Aclaración importante: la tecnología NO cambia entre v1 y v2

Un error común es pensar que v1 necesita frameworks "vulnerables" o versiones rotas de las tecnologías. **No es así.** El stack (Node.js, Express, SQLite/`better-sqlite3`, JWT) es el **mismo en ambas versiones**. Express, por ejemplo, no trae seguridad por defecto (no agrega headers, no valida inputs, no limita requests) — eso se agrega explícitamente en v2 vía librerías y patrones de código, no cambiando de framework.

La inseguridad de v1 viene exclusivamente de:
- **Cómo se escribe el código** (queries concatenadas vs. parametrizadas)
- **Qué protecciones se omiten** (sin Helmet, sin rate limiting, sin validación de ownership)
- **Qué configuración se deja abierta** (CORS `*`, secretos en el código, modo debug)

### Excepción: una dependencia con CVE conocido (para la etapa de SCA)
Para que el pipeline SecDevOps tenga algo real que reportar en la etapa de **SCA** (Software Composition Analysis), sí conviene fijar en v1 una versión antigua de una dependencia con vulnerabilidad pública conocida, y actualizarla en v2. Ejemplo concreto:

| Dependencia | Versión en v1 (vulnerable) | CVE | Versión en v2 (parcheada) |
|---|---|---|---|
| `jsonwebtoken` | `8.5.1` o anterior | CVE-2022-23529 (verificación de firma insuficiente en ciertos casos de uso) | última versión estable (`^9.x`) |

El agente debe verificar el CVE exacto y la versión afectada al momento de implementar (las bases de datos de vulnerabilidades cambian), usando `npm audit` como fuente de verdad al construir v1 y v2. Esto da evidencia real de: `npm audit`/Trivy detecta el CVE en v1 → se actualiza la dependencia → el pipeline en v2 pasa limpio.

---

## 3. Versión 1 — Insegura (sin DevSecOps)

### Vulnerabilidades a implementar (7)

| # | Vulnerabilidad | Dónde | Detalle técnico |
|---|---|---|---|
| 1 | SQL Injection | Login y búsqueda de recursos | Queries armadas con concatenación de strings, sin parametrizar |
| 2 | Almacenamiento inseguro de contraseñas | Registro/login | Password guardado en texto plano (o MD5 sin salt) en la BD |
| 3 | JWT inseguro | Auth | Secreto hardcodeado en el código fuente, sin expiración (`expiresIn` ausente) |
| 4 | Broken Access Control (IDOR) | Endpoints de recursos | No se valida que `resource.user_id === req.user.id`; cualquier usuario autenticado accede a recursos de otros cambiando el `:id` |
| 5 | Subida de archivos insegura | Upload | Sin whitelist de extensión/MIME, sin límite de tamaño, se guarda con el nombre original del archivo (permite path traversal tipo `../../`) |
| 6 | Configuración insegura | Global | CORS abierto a `*`, sin Helmet (headers de seguridad ausentes), modo debug expone stack traces completos en respuestas de error, sin rate limiting en login |
| 7 | Secretos hardcodeados | Código fuente | `JWT_SECRET`, credenciales de BD, etc. escritos directo en el código, no en variables de entorno |

### Estructura de carpetas v1
```
/v1-inseguro
  /src
    /db          (schema.sql, seed.js, connection.js)
    /routes      (auth.js, resources.js)
    /middleware  (auth.js - verificación JWT insegura)
    /uploads     (carpeta destino de archivos subidos)
    app.js
    server.js
  Dockerfile
  package.json
  README.md      (cómo correr + lista de vulnerabilidades intencionales, para referencia propia/docente)
```

### Evidencia a recolectar de cada vulnerabilidad (para el informe)
Para cada una de las 7, documentar:
- Comando/petición usada para explotarla (curl o capturas de Postman)
- Resultado obtenido (ej. dump de usuarios, acceso a recurso ajeno)
- Captura de pantalla o output de terminal

---

## 4. Versión 2 — Segura (SecDevOps + arquitectura)

### Mitigaciones (correspondencia 1 a 1 con la tabla anterior)

| # | Vulnerabilidad v1 | Mitigación v2 |
|---|---|---|
| 1 | SQL Injection | Queries parametrizadas (prepared statements de `better-sqlite3`) o Knex.js; validación de input con Zod/Joi |
| 2 | Password en texto plano | Hashing con `bcrypt` (o `argon2`), salt automático |
| 3 | JWT inseguro | Secreto desde variable de entorno, `expiresIn` corto + refresh token, algoritmo explícito (`HS256`) |
| 4 | IDOR | Middleware de autorización que valida ownership del recurso en cada operación (no solo autenticación) |
| 5 | Upload inseguro | Whitelist real de MIME type (verificado por contenido, no solo extensión), límite de tamaño, nombre de archivo generado con UUID, almacenamiento fuera de rutas públicas |
| 6 | Config insegura | Helmet.js (headers de seguridad), CORS restringido a origen conocido, manejo centralizado de errores sin exponer stack trace, rate limiting (`express-rate-limit`) en login |
| 7 | Secretos hardcodeados | `.env` + `dotenv`, `.env.example` en el repo, secretos reales fuera de git |

### Arquitectura v2 (por capas)
```
/v2-seguro
  /src
    /config        (env, helmet config, cors config)
    /db            (schema.sql, migrations, connection.js)
    /routes        (auth.js, resources.js)
    /controllers   (lógica de request/response)
    /services      (lógica de negocio)
    /repositories   (acceso a datos, queries parametrizadas)
    /middleware    (auth.js, authorize.js, errorHandler.js, rateLimiter.js)
    /validators    (esquemas Zod/Joi)
    /uploads       (fuera de rutas estáticas públicas)
    app.js
    server.js
  /.github
    /workflows
      pipeline.yml
  Dockerfile
  .env.example
  package.json
  README.md
```

### Pipeline SecDevOps (`.github/workflows/pipeline.yml`)
Etapas sugeridas, en orden:
1. **Lint + tests unitarios** (npm run lint / npm test)
2. **SAST** — Semgrep (reglas OWASP Top 10 / seguridad Node.js)
3. **SCA** — `npm audit --audit-level=high`
4. **Secret scanning** — gitleaks (contra el historial del repo)
5. **Build de imagen Docker**
6. **Escaneo de imagen** — Trivy (vulnerabilidades del sistema base y dependencias)
7. *(Opcional)* **DAST** — OWASP ZAP baseline scan contra un contenedor levantado en el runner

Cada etapa debe fallar el pipeline (exit code ≠ 0) si encuentra hallazgos críticos — esto es lo que se documenta y screenshotea para el informe.

---

## 5. Informe técnico — estructura (LIGERO, secundario al código)

El docente valora principalmente **las dos aplicaciones funcionando**, no la extensión del informe. Por eso este documento va como `informe-tecnico.md` dentro del repo (no requiere Word/PDF ni diseño elaborado) y debe ser breve y directo:

1. **Contexto y objetivo** del proyecto (2-3 párrafos)
2. **Problemas encontrados en v1** — una tabla: vulnerabilidad, categoría OWASP/CWE, breve descripción de cómo se explota
3. **Solución aplicada en v2** — misma tabla extendida con una columna "mitigación aplicada"
4. **Pipeline SecDevOps** — lista simple de las etapas configuradas (Semgrep, npm audit, Trivy, gitleaks) y qué detectan
5. **Conclusión** (1 párrafo)

Sin diagramas obligatorios, sin capturas extensas — solo lo suficiente para dejar constancia de qué se hizo y por qué. El esfuerzo real va en el código de v1 y v2.

Mapeo sugerido OWASP Top 10 / CWE para la tabla del punto 3:
- SQL Injection → CWE-89 / A03:2021-Injection
- Password en texto plano → CWE-256 / A02:2021-Cryptographic Failures
- JWT inseguro → CWE-798 (credenciales hardcodeadas) / A02:2021
- IDOR → CWE-639 / A01:2021-Broken Access Control
- Upload inseguro → CWE-434 / A05:2021-Security Misconfiguration
- Config insegura (CORS, headers, debug) → A05:2021-Security Misconfiguration
- Secretos hardcodeados → CWE-798 / A02:2021

---

## 6. Estructura final del repositorio

```
/repo-raiz
  /v1-inseguro
  /v2-seguro
  /informe
    informe-tecnico.md (o .pdf)
  README.md   (raíz: explica el propósito del repo, cómo navegar ambas versiones)
```

---

## 7. Plan de trabajo por hitos (sin fechas fijas)

1. Definir esquema de BD y endpoints (✅ ya definido arriba)
2. Construir v1 completa y funcional
3. Explotar y documentar cada una de las 7 vulnerabilidades (capturas/comandos)
4. Diseñar arquitectura v2 (refactor real, no parche superficial)
5. Implementar v2 con las 7 mitigaciones
6. Configurar pipeline SecDevOps completo (los 6-7 pasos)
7. Ejecutar pipeline y capturar evidencia de cada etapa (SAST, SCA, secretos, imagen)
8. Redactar informe técnico integrando evidencia de v1 y v2
9. Revisión final del repo (READMEs, `.env.example`, `.gitignore`, que no queden secretos reales versionados)

---

## 8. Instrucciones para el agente de código

Al ejecutar este plan:
- Construir primero **v1 completa y funcional** antes de tocar v2 (v1 debe correr sin errores, con las 7 vulnerabilidades intencionalmente presentes y verificables).
- Cada vulnerabilidad de v1 debe ser **explotable de forma real** (no simulada), para poder generar evidencia genuina.
- v2 no es un "parche" de v1: debe ser un **refactor arquitectónico** (capas separadas: routes/controllers/services/repositories/middleware).
- El pipeline de v2 debe ejecutarse realmente en GitHub Actions (no solo existir el archivo yml) para poder capturar evidencia de ejecución.
- Mantener paridad total de endpoints entre v1 y v2 para que la comparación en el informe sea directa.
