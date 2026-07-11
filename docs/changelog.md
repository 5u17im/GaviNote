# Registro de Cambios (Changelog) — GraviNote

Todos los cambios notables en este proyecto serán documentados en este archivo. El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [SemVer](https://semver.org/spec/v2.0.0.html).

> **Empresa:** Nothing Sense  
> **Desarrollador:** 5u17im

---

## [1.0.0-fase0] - 2026-07-10

### Añadido
- **PRD (Documento de Requerimientos de Producto):** Definición de la visión del producto, perfiles de usuario, historias de usuario con criterios de aceptación detallados y hitos de desarrollo.
- **Especificación de Arquitectura:** Diseño del bridge de sincronización Matter.js ↔ React sin re-renders innecesarios (manipulación DOM directa en RAF), esquema de Zustand Slices, cálculo de trazados Bézier para conexiones y fórmulas físicas de magnetismo.
- **Tutorial de Integración y Uso:** Manual para desarrolladores explicando cómo añadir un nuevo tipo de nodo (ejemplo paso a paso para el tipo `pregunta`), y guía completa de usuario para interactuar con el lienzo físico.
- **Plan de Implementación:** Pipeline técnico secuencial para el desarrollo dividido en 4 fases de ejecución.
- **Registro de Cambios (Changelog):** Este archivo para la bitácora y auditoría de adiciones, cambios y correcciones.

---

### Notas de Versión
* La documentación técnica inicial ha sido consolidada en la carpeta `/docs` del proyecto como base de conocimiento técnico y funcional.
* El lienzo se ha definido como **Modo Oscuro único** con soporte de fuentes editoriales (`DM Serif Display` + `Inter` + `JetBrains Mono`).
