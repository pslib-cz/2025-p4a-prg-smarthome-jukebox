import { test, expect } from "@playwright/test";

const appUrl = process.env.APP_URL ?? "http://127.0.0.1:5173/";

test("renders Google Assistant feedback from Home Assistant helpers", async ({
  page,
}) => {
  await page.goto(appUrl, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Open Telemetry Deck" }).click();

  await expect(
    page.getByRole("heading", { name: "Telemetry Deck" }),
  ).toBeVisible();
  await expect(page.getByText("Voice source")).toBeVisible();
  await expect(page.getByText("Google Assistant").first()).toBeVisible();
  await expect(page.getByText("Last voice")).toBeVisible();
  await expect(page.getByText("Play music").first()).toBeVisible();
});
