import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { JukeboxProvider } from "./state/JukeboxProvider.tsx";
import { mockJukeboxState } from "./state/mockJukeboxState.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <JukeboxProvider initialState={mockJukeboxState}>
      <App />
    </JukeboxProvider>
  </StrictMode>,
);
