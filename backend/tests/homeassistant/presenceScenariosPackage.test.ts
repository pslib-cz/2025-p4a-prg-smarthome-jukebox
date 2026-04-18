import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readFixture(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("presence scenarios package", () => {
  it("defines the arrival, leave, and manual override automation flow", () => {
    const packageYaml = readFixture(
      "../../../homeassistant/packages/jukebox_presence_scenarios.yaml",
    );

    expect(packageYaml).toContain("HAJukeBox Arrival Auto Focus Mode");
    expect(packageYaml).toContain("HAJukeBox Leave Auto Eco Mode");
    expect(packageYaml).toContain("HAJukeBox Manual Mode Override");
  });

  it("defines a clap skip cooldown timer and dedicated clap automation", () => {
    const packageYaml = readFixture(
      "../../../homeassistant/packages/jukebox_presence_scenarios.yaml",
    );

    expect(packageYaml).toContain("hajukebox_clap_skip_cooldown");
    expect(packageYaml).toContain("HAJukeBox Clap Next Track");
    expect(packageYaml).toContain("topic: jukebox/sensors/clap");
  });

  it("routes clap skips through the backend next-track script and logbook", () => {
    const packageYaml = readFixture(
      "../../../homeassistant/packages/jukebox_presence_scenarios.yaml",
    );

    expect(packageYaml).toContain("service: script.hajukebox_next");
    expect(packageYaml).toContain("service: timer.start");
    expect(packageYaml).toContain("Clap shortcut skipped to the next track");
  });
});
