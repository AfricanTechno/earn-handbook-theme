const { defineConfig } = require('@playwright/test');

const windowsChromeUA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';
const windowsFirefoxUA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0';
const iphoneSafariUA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ipadSafariUA =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const androidChromeUA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36';

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  reporter: 'list',
  outputDir: 'test-results',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'node scripts/serve-preview.mjs',
    url: 'http://127.0.0.1:4173/preview/index.html',
    reuseExistingServer: true,
    timeout: 120000
  },
  projects: [
    {
      name: 'iphone-safari',
      use: {
        browserName: 'webkit',
        viewport: { width: 390, height: 844 },
        screen: { width: 390, height: 844 },
        userAgent: iphoneSafariUA,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        locale: 'en-US'
      }
    },
    {
      name: 'ipad-safari',
      use: {
        browserName: 'webkit',
        viewport: { width: 820, height: 1180 },
        screen: { width: 820, height: 1180 },
        userAgent: ipadSafariUA,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        locale: 'en-US'
      }
    },
    {
      name: 'android-chrome',
      use: {
        browserName: 'chromium',
        viewport: { width: 412, height: 915 },
        screen: { width: 412, height: 915 },
        userAgent: androidChromeUA,
        deviceScaleFactor: 2.625,
        isMobile: true,
        hasTouch: true,
        locale: 'en-US'
      }
    },
    {
      name: 'windows-chrome',
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
        screen: { width: 1440, height: 900 },
        userAgent: windowsChromeUA,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        locale: 'en-US'
      }
    },
    {
      name: 'windows-firefox',
      use: {
        browserName: 'firefox',
        viewport: { width: 1440, height: 900 },
        screen: { width: 1440, height: 900 },
        userAgent: windowsFirefoxUA,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        locale: 'en-US'
      }
    }
  ]
});
