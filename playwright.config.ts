import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run build && node scripts/serve-out.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}/ko/`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
