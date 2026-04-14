import { applyJukeboxCommand } from "./jukeboxReducer";
import { mockJukeboxState } from "./mockJukeboxState";
import type {
  JukeboxAppState,
  JukeboxCommand,
  JukeboxDataSource,
} from "./jukeboxTypes";

function cloneState(state: JukeboxAppState) {
  return structuredClone(state);
}

class MockJukeboxDataSource implements JukeboxDataSource {
  private currentState = cloneState(mockJukeboxState);
  private listeners = new Set<(state: JukeboxAppState) => void>();

  async getInitialState() {
    return cloneState(this.currentState);
  }

  async sendCommand(command: JukeboxCommand) {
    this.currentState = applyJukeboxCommand(this.currentState, command);
    this.emit();
  }

  subscribe(onState: (state: JukeboxAppState) => void) {
    this.listeners.add(onState);
    onState(cloneState(this.currentState));

    return () => {
      this.listeners.delete(onState);
    };
  }

  private emit() {
    const snapshot = cloneState(this.currentState);

    this.listeners.forEach((listener) => {
      listener(snapshot);
    });
  }
}

export const mockDataSource = new MockJukeboxDataSource();
