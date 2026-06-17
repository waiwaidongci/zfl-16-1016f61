const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixels: 50,
      maxDiffPixelRatio: 0.02
    }
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:8080",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "smoke",
      testMatch: "**/smoke.spec.js",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        launchOptions: {
          args: ["--disable-web-security", "--allow-file-access-from-files"]
        },
        storageState: undefined
      }
    },
    {
      name: "png-export",
      testMatch: "**/png-export.spec.js",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        launchOptions: {
          args: ["--disable-web-security", "--allow-file-access-from-files"]
        }
      }
    }
  ],
  webServer: {
    command: "npx http-server . -p 8080 -c-1 --silent",
    url: "http://127.0.0.1:8080/index.html",
    reuseExistingServer: !process.env.CI,
    timeout: 15_000
  }
});
