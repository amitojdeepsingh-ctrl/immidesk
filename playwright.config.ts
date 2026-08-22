import { defineConfig, devices, type PlaywrightTestConfig } from "@playwright/test";

/**
 * ImmigDesk E2E smoke suite.
 *
 * Target selection:
 *   - E2E_BASE_URL unset (default): tests run against a LOCAL production server.
 *     The webServer block below boots `npm run start`, which serves the output of
 *     `next build` — so run `npm run build` first or the server cannot start.
 *   - E2E_BASE_URL set (e.g. https://immidesk.vercel.app): tests hit that URL and
 *     no local server is started at all (the webServer block is omitted).
 */

const isCI = !!process.env.CI;

const config: PlaywrightTestConfig = defineConfig({
  testDir: "e2e",
  /* Fully parallel is pointless at workers=1; keep ordering deterministic. */
  fullyParallel: false,
  workers: 1,
  retries: isCI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  /* Spread-in so E2E_BASE_URL targets skip local server orchestration entirely. */
  ...(process.env.E2E_BASE_URL
    ? {}
    : {
        webServer: {
          command: "npm run start",
          url: "http://localhost:3000",
          timeout: 120_000,
          reuseExistingServer: !isCI,
        },
      }),
});

export default config;
