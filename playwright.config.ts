import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  timeout: 60000,
  
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],

  use: {
    
   
    viewport: { width: 1366, height: 768 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
    
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',

    launchOptions: {
      args: [
        
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-infobars'
      ]
    }
  }
});
