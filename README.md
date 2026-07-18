# SecDevOps Case Study

Caso de estudio de Ciberseguridad que compara dos versiones de la misma app de notas, autenticación y archivos:

- [`v1-inseguro/`](./v1-inseguro): contiene 7 vulnerabilidades intencionales para practicar en local.
- [`v2-seguro/`](./v2-seguro): aplica las mitigaciones, arquitectura por capas y controles SecDevOps.

> `v1-inseguro` es exclusivamente educativo. No la expongas a una red ni la uses como referencia para proyectos reales.

## Ejecutar

Requisito: Node.js LTS.

Abrí dos terminales desde la raíz del repositorio.

```powershell
# Terminal 1: aplicación vulnerable
Set-Location v1-inseguro
npm install
npm run seed
npm start
```

```powershell
# Terminal 2: aplicación protegida
Set-Location v2-seguro
Copy-Item .env.example .env
# En .env, definí JWT_SECRET y JWT_REFRESH_SECRET y usá CORS_ORIGIN=http://localhost:43172
npm install
npm run seed
npm start
```

Luego probá las interfaces en el navegador:

| Versión | URL |
| --- | --- |
| v1 insegura | http://localhost:43171 |
| v2 segura | http://localhost:43172 |

Ambas se inician con los usuarios `alice` / `alice123` y `bob` / `bob123`.

## Qué comparar

Las dos apps tienen el mismo alcance funcional, pero v1 expone SQL injection, contraseñas en texto plano, JWT inseguro, IDOR, upload inseguro, configuración abierta y secretos hardcodeados. V2 mitiga esos riesgos con consultas parametrizadas, bcrypt, validación, autorización, headers, rate limiting y configuración mediante variables de entorno.

Ambas interfaces incluyen el catalogo del laboratorio: las siete vulnerabilidades originales ya estan disponibles como lecciones guiadas. La documentacion esta en [`docs/challenges/`](./docs/challenges/).

Para el detalle y los ejercicios: [`v1-inseguro/README.md`](./v1-inseguro/README.md), [`v2-seguro/README.md`](./v2-seguro/README.md) y [`plan-proyecto-secdevops.md`](./plan-proyecto-secdevops.md).
