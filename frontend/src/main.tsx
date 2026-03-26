import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { JukeboxProvider } from "./state/JukeboxProvider.tsx";
import { mockJukeboxState } from "./state/mockJukeboxState.ts";
import { createBackendHttpTransport } from "./state/backendHttpTransport.ts";
import { createMockHomeAssistantTransport } from "./state/mockHomeAssistantTransport.ts";
import { RemoteJukeboxDataSource } from "./state/remoteDataSource.ts";

const remoteDataSource = new RemoteJukeboxDataSource({
  ha: createMockHomeAssistantTransport(),
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
