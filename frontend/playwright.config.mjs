import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright",
  testMatch: "**/*.playwright.mjs",
  use: {
    headless: true,
  },
  workers: 1,
});
