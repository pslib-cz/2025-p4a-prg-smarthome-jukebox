import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { JukeboxProvider } from "./state/JukeboxProvider.tsx";
import { mockJukeboxState } from "./state/mockJukeboxState.ts";
import { createBackendHttpTransport } from "./state/backendHttpTransport.ts";
import {
  createHomeAssistantTransport,
  readHomeAssistantTransportConfig,
} from "./state/homeAssistantTransport.ts";
import { createMockHomeAssistantTransport } from "./state/mockHomeAssistantTransport.ts";
import { RemoteJukeboxDataSource } from "./state/remoteDataSource.ts";

const homeAssistantConfig = readHomeAssistantTransportConfig();
const remoteDataSource = new RemoteJukeboxDataSource({
  ha: homeAssistantConfig
    ? createHomeAssistantTransport(homeAssistantConfig)
    : createMockHomeAssistantTransport(),
  backend: createBackendHttpTransport(),
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <JukeboxProvider
      initialState={mockJukeboxState}
      dataSource={remoteDataSource}
    >
      <App />
    </JukeboxProvider>
  </StrictMode>,
);
