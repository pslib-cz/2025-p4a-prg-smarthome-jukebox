import { test, expect } from "@playwright/test";

const appUrl = process.env.APP_URL ?? "http://127.0.0.1:5173/";
const expectedStatus = process.env.EXPECTED_SPOTIFY_STATUS ?? "Disconnected";
const expectedPrimaryAction =
  process.env.EXPECTED_PRIMARY_ACTION ?? "Connect Spotify";
const expectedTrackTitle = process.env.EXPECTED_TRACK_TITLE ?? "";
const expectedStatusText = process.env.EXPECTED_STATUS_TEXT ?? "";
const screenshotPath = process.env.SCREENSHOT_PATH ?? "";

test("renders the expected Spotify panel state", async ({ page }) => {
  await page.goto(appUrl, { waitUntil: "networkidle" });

  const switchButton = page.getByRole("button", {
    name: /Switch to Spotify|Back to Local Music/,
  });
  await expect(switchButton).toBeVisible();

  if ((await switchButton.textContent())?.includes("Switch to Spotify")) {
    await switchButton.click();
  }

  await expect(page.getByRole("heading", { name: "Spotify" })).toBeVisible();
  await expect(page.getByText(expectedStatus, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: expectedPrimaryAction, exact: true }),
  ).toBeVisible();

  if (expectedStatusText) {
    await expect(page.getByText(expectedStatusText, { exact: false })).toBeVisible();
  }

  if (expectedTrackTitle) {
    await expect(page.getByText(expectedTrackTitle, { exact: true })).toBeVisible();
  }

  if (screenshotPath) {
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });
  }
});
