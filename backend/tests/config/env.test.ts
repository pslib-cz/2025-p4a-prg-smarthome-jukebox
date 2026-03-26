import { describe, expect, it } from "vitest";
import {
  buildConfig,
  normalizeMediaLibraryPath,
} from "../../src/config/env.js";

describe("buildConfig", () => {
  it("uses the default host and port when env is missing", () => {
    expect(buildConfig({} as NodeJS.ProcessEnv)).toEqual({
      host: "0.0.0.0",
      port: 3000,
      mediaLibraryPath: null,
    });
  });

  it("accepts a custom host and port from env", () => {
    expect(
      buildConfig({
        HAJUKEBOX_HOST: "127.0.0.1",
        HAJUKEBOX_PORT: "4123",
      }),
    ).toEqual({
      host: "127.0.0.1",
      port: 4123,
      mediaLibraryPath: null,
    });
  });

  it("throws when the port is invalid", () => {
    expect(() =>
      buildConfig({
        HAJUKEBOX_PORT: "70000",
      }),
    ).toThrowError("Invalid HAJUKEBOX_PORT: 70000");
  });

  it("normalizes a Windows media path for WSL-style Linux mounts", () => {
    expect(
      normalizeMediaLibraryPath("C:\\Users\\jiri\\Music", "linux"),
    ).toBe("/mnt/c/Users/jiri/Music");
  });
});
