import { test, expect } from "@playwright/test";
import { readHomeAssistantRuntimeConfig } from "./haRuntimeConfig.mjs";

const appUrl = process.env.APP_URL ?? "http://127.0.0.1:5173/";
const { baseUrl: haBaseUrl, token: haToken } = readHomeAssistantRuntimeConfig();

async function callService(api, domain, service, data) {
  const response = await api.post(`/api/services/${domain}/${service}`, {
    data,
  });

  expect(response.ok()).toBeTruthy();
}

test("configures the real Home Assistant runtime through Playwright API and frontend reflects it", async ({
  page,
  playwright,
}) => {
  const api = await playwright.request.newContext({
    baseURL: haBaseUrl,
    extraHTTPHeaders: {
      Authorization: `Bearer ${haToken}`,
      "Content-Type": "application/json",
    },
  });

  await callService(api, "input_text", "set_value", {
    entity_id: "input_text.hajukebox_presence_reason_value",
    value: "No sensor data",
  });
  await callService(api, "input_text", "set_value", {
    entity_id: "input_text.hajukebox_uptime_value",
    value: "HA online",
  });
  await callService(api, "input_select", "select_option", {
    entity_id: "input_select.hajukebox_mode",
    option: "Idle",
  });
  await callService(api, "input_button", "press", {
    entity_id: "input_button.hajukebox_google_play_request",
  });

  await page.goto(appUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Open Telemetry Deck" }).click();

  await expect(page.getByText("No sensor data").first()).toBeVisible();
  await expect(page.getByText("HA online").first()).toBeVisible();
  await expect(page.getByText("Idle").first()).toBeVisible();
  await expect(page.getByText("Google Assistant").first()).toBeVisible();
  await expect(page.getByText("Play music").first()).toBeVisible();

  await api.dispose();
});
