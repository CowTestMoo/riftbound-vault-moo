const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  retries: 1,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    port: 4173,
    reuseExistingServer: false,
    timeout: 15000
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } }
    },
    {
      name: 'desktop-firefox',
      use: { browserName: 'firefox', viewport: { width: 1440, height: 900 } }
    },
    {
      name: 'desktop-webkit',
      use: { browserName: 'webkit', viewport: { width: 1440, height: 900 } }
    },
    {
      name: 'phone-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 412, height: 915 },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 2.625
      }
    },
    {
      name: 'phone-webkit',
      use: {
        browserName: 'webkit',
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 3,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'
      }
    },
    {
      name: 'ipad-webkit',
      use: {
        browserName: 'webkit',
        viewport: { width: 834, height: 1194 },
        hasTouch: true,
        deviceScaleFactor: 2,
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'
      }
    }
  ]
});
