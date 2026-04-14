import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readFixture(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("home assistant google assistant package", () => {
  it("defines exposeable Google Assistant request buttons and voice helpers", () => {
    const packageYaml = readFixture(
      "../../../homeassistant/packages/jukebox_google_assistant.yaml",
    );

    expect(packageYaml).toContain("input_button:");
    expect(packageYaml).toContain("hajukebox_google_play_request:");
    expect(packageYaml).toContain("hajukebox_google_pause_request:");
    expect(packageYaml).toContain("hajukebox_google_next_request:");
    expect(packageYaml).toContain("hajukebox_google_previous_request:");
    expect(packageYaml).toContain("hajukebox_last_voice_source:");
    expect(packageYaml).toContain("hajukebox_last_voice_command:");
    expect(packageYaml).toContain("hajukebox_last_voice_response:");
  });

  it("routes Google Assistant requests through HA automations into existing media scripts", () => {
    const packageYaml = readFixture(
      "../../../homeassistant/packages/jukebox_google_assistant.yaml",
    );

    expect(packageYaml).toContain("alias: HAJukeBox Google Assistant Play Request");
    expect(packageYaml).toContain('value: "Google Assistant"');
    expect(packageYaml).toContain('value: "Play music"');
    expect(packageYaml).toContain('message: "Requested local playback"');
    expect(packageYaml).toContain("service: script.hajukebox_play");
    expect(packageYaml).toContain("service: script.hajukebox_pause");
    expect(packageYaml).toContain("service: script.hajukebox_next");
    expect(packageYaml).toContain("service: script.hajukebox_previous");
  });

  it("ships an example google_assistant config that exposes the request buttons only", () => {
    const exampleYaml = readFixture(
      "../../../homeassistant/google_assistant.example.yaml",
    );

    expect(exampleYaml).toContain("google_assistant:");
    expect(exampleYaml).toContain("expose_by_default: false");
    expect(exampleYaml).toContain("input_button.hajukebox_google_play_request:");
    expect(exampleYaml).toContain("input_button.hajukebox_google_pause_request:");
    expect(exampleYaml).toContain("input_button.hajukebox_google_next_request:");
    expect(exampleYaml).toContain("input_button.hajukebox_google_previous_request:");
  });
});
