import { test, expect } from "@playwright/test";

const appUrl = process.env.APP_URL ?? "http://127.0.0.1:5173/";
const screenshotPath = process.env.SCREENSHOT_PATH ?? "";

test("renders Home Assistant telemetry from REST and updates over WebSocket", async ({
  page,
}) => {
  await page.goto(appUrl, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Open Telemetry Deck" }).click();

  await expect(
    page.getByRole("heading", { name: "Telemetry Deck" }),
  ).toBeVisible();
  await expect(page.getByText(/91% confidence/u)).toBeVisible();
  await expect(page.getByText("Mobile beacon + distance lock").first()).toBeVisible();
  await expect(page.getByText("Focus armed").first()).toBeVisible();
  await expect(page.getByText("31 cm").first()).toBeVisible();

  if (screenshotPath) {
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });
  }
});
