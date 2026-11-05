import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: `http://127.0.0.1:${PORT}` },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run build && python3 -m http.server ${PORT} --bind 127.0.0.1 --directory out`,
    url: `http://127.0.0.1:${PORT}/ko/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
