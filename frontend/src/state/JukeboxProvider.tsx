import {
  startTransition,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { JukeboxContext, type JukeboxProviderStatus } from "./jukeboxContext";
import { mockDataSource } from "./mockDataSource";
import type { JukeboxAppState, JukeboxDataSource } from "./jukeboxTypes";

interface JukeboxProviderProps {
  children: ReactNode;
  dataSource?: JukeboxDataSource;
  initialState: JukeboxAppState;
}

export function JukeboxProvider({
  children,
  dataSource = mockDataSource,
  initialState,
}: JukeboxProviderProps) {
  const [state, setState] = useState(initialState);
  const [status, setStatus] = useState<JukeboxProviderStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    let unsubscribe: (() => void) | undefined;

    async function loadState() {
      setStatus("loading");
      setError(null);

      try {
        const initial = await dataSource.getInitialState();

        if (!isActive) {
          return;
        }

        startTransition(() => {
          setState(initial);
        });
        setStatus("ready");

        if (!dataSource.subscribe) {
          return;
        }

        const cleanup = await dataSource.subscribe((nextState) => {
          if (!isActive) {
            return;
          }

          startTransition(() => {
            setState(nextState);
          });
          setStatus("ready");
        });

        unsubscribe = cleanup;
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load jukebox state.",
        );
        setStatus("error");
      }
    }

    void loadState();

    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }, [dataSource]);

  async function sendCommand(command: Parameters<JukeboxDataSource["sendCommand"]>[0]) {
    setError(null);

    try {
      await dataSource.sendCommand(command);
    } catch (commandError) {
      setError(
        commandError instanceof Error
          ? commandError.message
          : "Failed to send command.",
      );
      setStatus("error");
    }
  }

  return (
    <JukeboxContext.Provider value={{ state, status, error, sendCommand }}>
      {children}
    </JukeboxContext.Provider>
  );
}
