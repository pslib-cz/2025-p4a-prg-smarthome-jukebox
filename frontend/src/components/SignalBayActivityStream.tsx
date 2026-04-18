import { useEffect, useRef, useState } from "react";
import type { TelemetryState } from "../state/jukeboxTypes";
import {
  formatActivityEventLog,
  getActivityLineTone,
  getVisibleActivityEvents,
} from "./signalBayEventLog";

interface SignalBayActivityStreamProps {
  eventLog: TelemetryState["eventLog"];
}

async function copyTextToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard is not available.");
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();

  const copySucceeded = document.execCommand("copy");
  textarea.remove();

  if (!copySucceeded) {
    throw new Error("Clipboard copy failed.");
  }
}

export default function SignalBayActivityStream({
  eventLog,
}: SignalBayActivityStreamProps) {
  const visibleEvents = getVisibleActivityEvents(eventLog);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const resetTimerIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerIdRef.current !== null) {
        window.clearTimeout(resetTimerIdRef.current);
      }
    };
  }, []);

  const handleCopyAll = async () => {
    try {
      await copyTextToClipboard(formatActivityEventLog(eventLog));
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }

    if (resetTimerIdRef.current !== null) {
      window.clearTimeout(resetTimerIdRef.current);
    }

    resetTimerIdRef.current = window.setTimeout(() => {
      setCopyStatus("idle");
      resetTimerIdRef.current = null;
    }, 1800);
  };

  const copyLabel =
    copyStatus === "copied"
      ? "Copied"
      : copyStatus === "error"
        ? "Retry copy"
        : "Copy all";

  return (
    <article className="bay-panel activity-stream-panel">
      <div className="bay-panel-head">
        <div>
          <span className="bay-panel-kicker">Live Activity</span>
          <h3 className="bay-panel-title">Human-readable actions</h3>
        </div>
        <span className="bay-panel-meta">Last {visibleEvents.length} events</span>
      </div>

      <div className="mqtt-terminal activity-stream">
        <div className="mqtt-terminal-topbar">
          <span className="mqtt-terminal-dot" />
          <span>events://jukebox/live</span>
          <button
            type="button"
            className="activity-stream-copy-button"
            onClick={handleCopyAll}
          >
            {copyLabel}
          </button>
        </div>

        <div className="activity-stream-body">
          {visibleEvents.length > 0 ? (
            visibleEvents.map((event) => (
              <div
                key={`${event.time}-${event.action}-${event.meta}`}
                className="activity-line"
                data-tone={getActivityLineTone(event)}
              >
                <span className="activity-line-time">{event.time}</span>
                <div className="activity-line-copy">
                  <strong>{event.action}</strong>
                  <span>{event.meta}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="activity-line is-empty">
              <span className="activity-line-copy">
                Waiting for the next state change from Home Assistant or the backend.
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
