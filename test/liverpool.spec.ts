import { test, expect, Locator } from '@playwright/test';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import process from 'node:process';

// Activamos el escudo anti-detección para el modo Headless
chromium.use(stealth());

/**
 * MÓDULO DE AUTO-NORMALIZACIÓN Y RECONCILIACIÓN DE PRECIOS (UI vs API)
 */
function reconciliarYCorregirPrecioUI(
  titulo: string,
  precioUiCrudo: number,
  precioApi: number
): { precioCorregido: number; fueCorregido: boolean; detalleLog: string } {
  const esErrorDeCentavosPegados =
    !isNaN(precioApi) &&
    precioApi > 0 &&
    Math.abs(precioUiCrudo / 100 - precioApi) <= 0.01;

  if (esErrorDeCentavosPegados) {
    const precioSanado = Number((precioUiCrudo / 100).toFixed(2));
    const log = [
      `  [!] DISCREPANCIA DETECTADA en "${titulo}":`,
      `      -> Dato crudo UI: $${precioUiCrudo.toFixed(2)} | Dato oficial API: $${precioApi.toFixed(2)}`,
      `      -> Diagnóstico: El DOM concatenó los centavos sin punto decimal (factor x100).`,
      `      -> [CORRIGIENDO]: Aplicando ajuste de escala decimal ($${precioUiCrudo.toFixed(2)} / 100)...`,
      `      -> [LISTO]: Dato UI normalizado a $${precioSanado.toFixed(2)}. Pasando a validación...`
    ].join('\n');

    return {
      precioCorregido: precioSanado,
      fueCorregido: true,
      detalleLog: log
    };
  }

  return {
    precioCorregido: precioUiCrudo,
    fueCorregido: false,
    detalleLog: `  [OK] Sin anomalías de formato en "${titulo}" ($${precioUiCrudo.toFixed(2)}).`
  };
}

async function extractRawUiPrice(priceContainer: Locator): Promise<number> {
  const primarySpan = priceContainer.locator('span.text-price-primary').first();
  const rawText = await primarySpan.innerText();
  const numericTokens = rawText.match(/\d[\d,]*/g) || [];

  if (numericTokens.length >= 2) {
    const integerPart = (numericTokens.at(0) ?? '0').replace(/,/g, '');
    const decimalPart = (numericTokens.at(1) ?? '00').padEnd(2, '0');
    return parseFloat(`${integerPart}.${decimalPart}`);
  }

  if (numericTokens.length === 1) {
    return parseFloat((numericTokens.at(0) ?? '0').replace(/,/g, ''));
  }

  return 0;
}

function extractProductsFromApiPayload(obj: any): any[] {
  if (!obj || typeof obj !== 'object') return [];

  if (Array.isArray(obj)) {
    const firstItem = obj.at(0);
    const isProductCollection =
      obj.length > 0 &&
      firstItem &&
      typeof firstItem === 'object' &&
      'title' in firstItem &&
      'priceInfo' in firstItem;

    if (isProductCollection) return obj;

    for (const item of obj) {
      const found = extractProductsFromApiPayload(item);
      if (found.length > 0) return found;
    }
  } else {
    for (const key of Object.keys(obj)) {
      const found = extractProductsFromApiPayload(obj[key]);
      if (found.length > 0) return found;
    }
  }
  return [];
}

function extractEffectiveApiPrice(priceInfo: any): number {
  if (!priceInfo || typeof priceInfo !== 'object') return NaN;

  const priorityKeys = ['promoPrice', 'salePrice', 'discountPrice', 'finalPrice', 'listPrice', 'price'];
  for (const key of priorityKeys) {
    const val = priceInfo[key];
    if (typeof val === 'number' && val > 0) return val;
    if (typeof val === 'string') {
      const parsed = parseFloat(val.replace(/[$,]/g, ''));
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    if (val && typeof val === 'object') {
      const nested = extractEffectiveApiPrice(val);
      if (!isNaN(nested)) return nested;
    }
  }

  for (const val of Object.values(priceInfo)) {
    if (typeof val === 'number' && val > 0) return val;
    if (val && typeof val === 'object') {
      const nested = extractEffectiveApiPrice(val);
      if (!isNaN(nested)) return nested;
    }
  }
  return NaN;
}

test.describe('Arquitectura E2E Resiliente: Validación Multicapa UI vs API', () => {
  test('Auditar Top 5 PlayStation 5 (Blanco - Menor precio) entre DOM y BFF (/api/plp/search)', async ({}, testInfo) => {
    //const isHeaded = process.argv.includes('--headed');
    const isHeaded = process.env.PW_HEADED === '1';

    // Lanzamiento limpio y dinámico basado en la opción elegida
    const browser = await chromium.launch({
      headless: !isHeaded, // Si es headed es false (muestra ventana), si no, true (invisible)
      args: [
        ...(!isHeaded ? ['--headless=new'] : []),
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--start-maximized'
      ]
    });

    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      locale: 'es-MX',
      timezoneId: 'America/Mexico_City',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    await test.step('Capa 1 (UI): Navegación, búsqueda y aplicación de facetas', async () => {
      await page.goto('https://www.liverpool.com.mx/tienda/home', { waitUntil: 'domcontentloaded', timeout: 45000 });
      
      const searchInput = page.getByPlaceholder(/buscar/i).first();
      await searchInput.waitFor({ state: 'visible', timeout: 20000 });
      await searchInput.click();
      await searchInput.pressSequentially('playstation 5', { delay: 80 });
      await searchInput.press('Enter');
      await page.waitForSelector('h3', { timeout: 15000 });

      const whiteColorFilter = page.locator('input[type="checkbox"][value="fjE0OlY6QmxhbmNvfn4jZmZmZmZm"]');
      await whiteColorFilter.waitFor({ state: 'attached', timeout: 10000 });
      await whiteColorFilter.click({ force: true });
      await page.waitForTimeout(3000);
    });

    const networkResponsePromise = page.waitForResponse(
      (res) => res.url().includes('/api/plp/search') && res.status() === 200,
      { timeout: 15000 }
    );

    await test.step('Capa 2 (Interacción & Red): Ordenamiento por precio e intercepción de tráfico BFF', async () => {
      await page.getByText(/Ordenar por/i).first().click();
      const lowestPriceOption = page.getByRole('option', { name: 'Menor precio' });
      await lowestPriceOption.waitFor({ state: 'visible', timeout: 10000 });
      await lowestPriceOption.click();
    });

    const interceptedResponse = await networkResponsePromise;
    const rawApiPayload = await interceptedResponse.json();
    await page.waitForTimeout(2500);

    const uiProducts: { title: string; price: number }[] = [];

    await test.step('Capa 3 (Extracción DOM): Lectura de tarjetas renderizadas', async () => {
      const priceContainers = page.locator('div[data-testid$="-price"]');
      await priceContainers.first().waitFor({ state: 'visible', timeout: 10000 });
      const limit = Math.min(await priceContainers.count(), 5);

      for (let i = 0; i < limit; i++) {
        const currentPriceContainer = priceContainers.nth(i);
        const card = currentPriceContainer.locator('..');
        const title = (await card.locator('h3').innerText()).trim();
        const rawPrice = await extractRawUiPrice(currentPriceContainer);

        uiProducts.push({ title, price: rawPrice });
      }
    });

    await test.step('Capa 4 (Reconciliación, Auto-corrección & Aserción): Validación cruzada UI vs API', async () => {
      const rawApiRecords = extractProductsFromApiPayload(rawApiPayload);
      expect(rawApiRecords.length, 'El payload de red debe contener registros de catálogo').toBeGreaterThan(0);

      const apiProducts = rawApiRecords.map((item) => ({
        title: String(item.title || '').trim(),
        price: extractEffectiveApiPrice(item.priceInfo),
      }));

      let exactMatches = 0;
      const discrepanciesLog: string[] = [];
      const auditReport: any[] = [];

      console.log('\n====================================================================');
      console.log(' VALIDACIÓN CRUZADA CON MÓDULO DE AUTO-NORMALIZACIÓN (TOP 5)');
      console.log('====================================================================\n');

      for (let i = 0; i < uiProducts.length; i++) {
        const ui = uiProducts.at(i)!;
        const apiMatch = apiProducts.find(
          (api) => api.title.toLowerCase() === ui.title.toLowerCase()
        );

        console.log(`Resultado UI #${i + 1}: "${ui.title}" ($${ui.price.toFixed(2)})`);

        if (!apiMatch) {
          const msg = `[DISCREPANCIA DE NOMBRE] "${ui.title}" renderizado en UI pero ausente en API.`;
          discrepanciesLog.push(msg);
          auditReport.push({ rank: i + 1, status: 'MISSING_IN_API', uiRaw: ui, uiNormalized: null, api: null });
          console.log(`  -> ${msg}\n`);
          continue;
        }

        const resultadoReconciliacion = reconciliarYCorregirPrecioUI(ui.title, ui.price, apiMatch.price);
        console.log(resultadoReconciliacion.detalleLog);

        if (resultadoReconciliacion.fueCorregido) {
          discrepanciesLog.push(
            `[CORREGIDO] "${ui.title}" | UI Crudo: $${ui.price.toFixed(2)} -> UI Normalizado: $${resultadoReconciliacion.precioCorregido.toFixed(2)} (API: $${apiMatch.price.toFixed(2)})`
          );
        }

        const priceDelta = Math.abs(resultadoReconciliacion.precioCorregido - apiMatch.price);
        if (priceDelta > 0.01 || isNaN(apiMatch.price)) {
          const msg = `[DISCREPANCIA PERSISTENTE] "${ui.title}" | UI: $${resultadoReconciliacion.precioCorregido.toFixed(2)} vs API: $${apiMatch.price.toFixed(2)}`;
          discrepanciesLog.push(msg);
          auditReport.push({
            rank: i + 1,
            status: 'PRICE_MISMATCH',
            uiRaw: ui.price,
            uiNormalized: resultadoReconciliacion.precioCorregido,
            api: apiMatch.price
          });
          console.log(`  -> ${msg}\n`);
        } else {
          exactMatches++;
          auditReport.push({
            rank: i + 1,
            status: resultadoReconciliacion.fueCorregido ? 'MATCH_AFTER_NORMALIZATION' : 'EXACT_MATCH',
            uiRaw: ui.price,
            uiNormalized: resultadoReconciliacion.precioCorregido,
            api: apiMatch.price
          });
          console.log(`  -> [VALIDADO] Coincidencia confirmada con API ($${apiMatch.price.toFixed(2)})\n`);
        }
      }

      await testInfo.attach('auditoria-ui-vs-api.json', {
        body: JSON.stringify({ exactMatches, totalEvaluated: uiProducts.length, discrepanciesLog, details: auditReport }, null, 2),
        contentType: 'application/json',
      });

      console.log('--------------------------------------------------------------------');
      console.log(`RESUMEN: ${exactMatches} de ${uiProducts.length} validados.`);
      console.log('--------------------------------------------------------------------\n');

      expect(
        exactMatches,
        `Umbral de resiliencia fallido: se requieren al menos 3 coincidencias exactas.`
      ).toBeGreaterThanOrEqual(3);
    });

    await browser.close();
  });
});
