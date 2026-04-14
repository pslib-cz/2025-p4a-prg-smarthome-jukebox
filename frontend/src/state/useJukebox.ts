import { useContext } from "react";
import { JukeboxContext } from "./jukeboxContext";

export function useJukebox() {
  const context = useContext(JukeboxContext);

  if (!context) {
    throw new Error("useJukebox must be used within a JukeboxProvider.");
  }

  return context;
}
