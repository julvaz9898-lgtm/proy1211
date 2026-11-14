# proy1211
# Automatización E2E & Validación Multicapa UI vs API — Pagina de Liverpool
# Arquitectura del Proyecto

proy1211/
├── .github/
│   └── workflows/
│       └── test.yml            # Pipeline CI/CD en GitHub Actions (Headless + Artefacto HTML)
├── test/
│   └── liverpool.spec.ts       # Suite principal dividida en 4 capas con auto-normalización UI/API
├── playwright.config.ts        # Configuración global (Headless por defecto, HTML Reporter, Screenshots)
├── run.js                      # Selector interactivo en consola para ejecución Headless / Headed
├── TEST_STRATEGY.md            # Documento de estrategia, gestión de riesgos y escalabilidad
├── package.json                # Dependencias y scripts de ejecución
└── README.md                   # Documentación principal

# Instalación y Ejecución Local

# Prerrequisitos
*Node.js** v18 o superior.
*Google Chrome** instalado en el sistema operativo.

# 1. Clonar e instalar dependencias
bash
git clone https://github.com
cd proy1211
npm install
npx playwright install chrome

# 2. Ejecutar las pruebas:
| Headless - Configurada Por defecto | `npm test` | `npx playwright test` | Ejecuta las pruebas en segundo plano sin interfaz gráfica. |
| Headed | `npm run test:headed` | `npx playwright test --headed` | Abre Google Chrome y muestra toda la interacción en tiempo real. |
| **Menú Interactivo en Consola** | `npm run test:menu` | `node run.js` | Permite elegir el modo de ejecución desde la terminal antes de iniciar.

# 3 Enlace a una ejecución de acciones en GitHub
El flujo ubicado en `.github/workflows/test.yml` se ejecuta automáticamente en cada `push` o `pull_request` hacia `main`, o manualmente mediante `workflow_dispatch`:
1. Instala las dependencias del proyecto y Google Chrome.
2. Ejecuta la suite completa en modo *Headless*.
3. Publica el directorio `playwright-report/` como un artefacto descargable llamado `playwright-html-report`.

