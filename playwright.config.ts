import { defineConfig } from '@playwright/test';
if (process.argv.includes('--headed')) {
  process.env.PW_HEADED = '1';
}
export default defineConfig({
  testDir: './test',
  timeout: 60000,
  reporter: [['list']],
  use: {
   // headless: true,
    viewport: { width: 1366, height: 768 },
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    launchOptions: {
      args: [
        //'--headless=new',
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox'
      ]
    }
  }
});
