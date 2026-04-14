import { createContext } from "react";
import type { JukeboxAppState, JukeboxCommand } from "./jukeboxTypes";

export type JukeboxProviderStatus = "loading" | "ready" | "error";

export interface JukeboxContextValue {
  state: JukeboxAppState;
  status: JukeboxProviderStatus;
  error: string | null;
  sendCommand: (command: JukeboxCommand) => Promise<void>;
}

export const JukeboxContext = createContext<JukeboxContextValue | null>(null);
