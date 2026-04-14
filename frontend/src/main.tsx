import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { JukeboxProvider } from "./state/JukeboxProvider.tsx";
import { emptyJukeboxState } from "./state/emptyJukeboxState.ts";
import { mockJukeboxState } from "./state/mockJukeboxState.ts";
import { createBackendHttpTransport } from "./state/backendHttpTransport.ts";
import {
  createHomeAssistantTransport,
  readHomeAssistantTransportConfig,
} from "./state/homeAssistantTransport.ts";
import { createMockHomeAssistantTransport } from "./state/mockHomeAssistantTransport.ts";
import { RemoteJukeboxDataSource } from "./state/remoteDataSource.ts";

const homeAssistantConfig = readHomeAssistantTransportConfig();
const bootstrapState = homeAssistantConfig
  ? emptyJukeboxState
  : mockJukeboxState;
const remoteDataSource = new RemoteJukeboxDataSource({
  ha: homeAssistantConfig
    ? createHomeAssistantTransport(homeAssistantConfig)
    : createMockHomeAssistantTransport(),
  backend: createBackendHttpTransport(),
}, bootstrapState);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <JukeboxProvider
      initialState={bootstrapState}
      dataSource={remoteDataSource}
    >
      <App />
    </JukeboxProvider>
  </StrictMode>,
);
