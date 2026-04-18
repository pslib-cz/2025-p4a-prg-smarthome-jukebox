import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readFixture(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("home assistant root configuration", () => {
  it("loads packages and merged scripts from the repository-owned folders", () => {
    const configurationYaml = readFixture("../../../homeassistant/configuration.yaml");

    expect(configurationYaml).toContain("packages: !include_dir_named packages");
    expect(configurationYaml).toContain("script: !include_dir_merge_named scripts");
  });

  it("explicitly enables recorder and logbook for custom activity entries", () => {
    const configurationYaml = readFixture("../../../homeassistant/configuration.yaml");

    expect(configurationYaml).toContain("recorder:");
    expect(configurationYaml).toContain("logbook:");
  });

  it("explicitly enables Home Assistant Cloud for the minimal root config", () => {
    const configurationYaml = readFixture("../../../homeassistant/configuration.yaml");

    expect(configurationYaml).toContain("cloud:");
  });

  it("pins Google Assistant exposure to the jukebox input_button request entities", () => {
    const configurationYaml = readFixture("../../../homeassistant/configuration.yaml");

    expect(configurationYaml).toContain("google_actions:");
    expect(configurationYaml).toContain("include_entities:");
    expect(configurationYaml).toContain("input_button.hajukebox_google_play_request");
    expect(configurationYaml).toContain("input_button.hajukebox_google_focus_mode_request");
    expect(configurationYaml).toContain("input_button.hajukebox_google_idle_mode_request");
    expect(configurationYaml).toContain("room: Living Room");
    expect(configurationYaml).toContain("Pust hudbu na jukeboxu");
    expect(configurationYaml).toContain("Dalsi skladba na jukeboxu");
  });

  it("allows the local Vite frontend origins through Home Assistant CORS", () => {
    const configurationYaml = readFixture("../../../homeassistant/configuration.yaml");

    expect(configurationYaml).toContain("http://127.0.0.1:5173");
    expect(configurationYaml).toContain("http://localhost:5173");
  });
});
