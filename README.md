# SecDevOps Case Study

Proyecto de la materia de Ciberseguridad: dos versiones de la misma aplicación (auth + CRUD de notas + upload/download de archivos, mismo stack Node.js/Express/SQLite/JWT) para contrastar desarrollo sin prácticas de seguridad frente a un flujo SecDevOps completo.

- [`v1-inseguro/`](./v1-inseguro): versión con 7 vulnerabilidades intencionales, explotables de forma real.
- [`v2-seguro/`](./v2-seguro): mismo alcance funcional, refactor arquitectónico en capas, 7 mitigaciones correspondientes y pipeline de CI/CD (Semgrep, npm audit, gitleaks, Trivy).
- [`informe/informe-tecnico.md`](./informe/informe-tecnico.md): informe técnico breve con evidencia de explotación/mitigación.

Ver `plan-proyecto-secdevops.md` para el detalle completo de alcance, vulnerabilidades y mitigaciones.
