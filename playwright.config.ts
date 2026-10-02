import { existsSync } from "node:fs";
import { defineConfig, devices, webkit, type Project } from "@playwright/test";

// Las pruebas corren contra dist/ servido como lo hace GitHub Pages (carpeta base,
// redirección a barra final, 404.html con estado 404, gzip). Compilar antes con las
// mismas variables: BASE_PATH=/rumbo-web/ SITE_URL=https://diegolazo84.github.io/rumbo-web
const PUERTO = Number(process.env.PUERTO ?? 4173);
const BASE = (process.env.BASE_PATH || "/rumbo-web/").replace(/\/?$/, "/");
// URL_PRUEBA=https://diegolazo84.github.io/rumbo-web prueba el sitio publicado (solo pruebas @produccion).
const URL_PRUEBA = process.env.URL_PRUEBA?.replace(/\/?$/, "/");
// Permite usar un Chromium ya instalado (CHROME_PATH); en CI se usa el de Playwright.
const chromium = { launchOptions: { executablePath: process.env.CHROME_PATH || undefined } };

// iPhone con WebKit: iOS pesa mucho en Chile. En CI es obligatorio; en local corre solo
// si WebKit está instalado (npx playwright install webkit).
const conWebkit = !!process.env.CI || existsSync(webkit.executablePath());

const proyectos: Project[] = [
  { name: "movil", use: { ...devices["Pixel 7"], ...chromium } },
  ...(conWebkit ? [{ name: "iphone", use: { ...devices["iPhone 15"] } }] : []),
  { name: "escritorio", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 }, ...chromium } },
];

export default defineConfig({
  testDir: "pruebas",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: URL_PRUEBA ?? `http://localhost:${PUERTO}${BASE}`,
    trace: "retain-on-failure",
  },
  projects: proyectos,
  grep: URL_PRUEBA ? /@produccion/ : undefined,
  webServer: URL_PRUEBA
    ? undefined
    : {
        command: `node scripts/servidor-pages.mjs dist ${PUERTO} ${BASE}`,
        url: `http://localhost:${PUERTO}${BASE}`,
        reuseExistingServer: !process.env.CI,
      },
});
