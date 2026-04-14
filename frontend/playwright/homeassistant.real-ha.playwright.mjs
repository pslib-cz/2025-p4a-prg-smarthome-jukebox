import { test, expect } from "@playwright/test";

const appUrl = process.env.APP_URL ?? "http://127.0.0.1:5173/";
const expectedConfidence = process.env.HA_EXPECTED_CONFIDENCE ?? "0% confidence";
const expectedReason = process.env.HA_EXPECTED_REASON ?? "No sensor data";
const expectedMode = process.env.HA_EXPECTED_MODE ?? "Idle";
const expectedDistance = process.env.HA_EXPECTED_DISTANCE ?? "0 cm";
const expectedVoiceSource =
  process.env.HA_EXPECTED_VOICE_SOURCE ?? "Google Assistant";
const expectedVoiceCommand =
  process.env.HA_EXPECTED_VOICE_COMMAND ?? "Play music";
const expectedUptime = process.env.HA_EXPECTED_UPTIME ?? "HA online";

test("renders telemetry from the real Home Assistant runtime without mock placeholders", async ({
  page,
}) => {
  await page.goto(appUrl, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Open Telemetry Deck" }).click();

  await expect(
    page.getByRole("heading", { name: "Telemetry Deck" }),
  ).toBeVisible();
  await expect(page.getByText(expectedConfidence)).toBeVisible();
  await expect(page.getByText(expectedReason).first()).toBeVisible();
  await expect(page.getByText(expectedMode).first()).toBeVisible();
  await expect(page.getByText(expectedDistance).first()).toBeVisible();
  await expect(page.getByText(expectedVoiceSource).first()).toBeVisible();
  await expect(page.getByText(expectedVoiceCommand).first()).toBeVisible();
  await expect(page.getByText(expectedUptime).first()).toBeVisible();

  await expect(page.getByText("Mobile beacon + distance lock")).toHaveCount(0);
  await expect(page.getByText("Focus armed")).toHaveCount(0);
  await expect(page.getByText("31 cm")).toHaveCount(0);
});
