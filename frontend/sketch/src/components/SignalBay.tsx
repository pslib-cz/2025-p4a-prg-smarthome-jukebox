import "./SignalBay.css";
import "./SignalBayPanels.css";
import "./SignalBayMotion.css";

interface SignalBayProps {
  onClose: () => void;
}

const SIGNAL_LEVELS = [
  { label: "Room", value: 74 },
  { label: "Links", value: 91 },
  { label: "Logs", value: 63 },
];

const ROOM_MARKERS = [
  { id: "entry", label: "Entry lane", angle: -34, radius: 126, tone: "accent" },
  { id: "presence", label: "Presence lock", angle: 28, radius: 82, tone: "good" },
  { id: "clap", label: "Clap echo", angle: 126, radius: 58, tone: "soft" },
];

const ROOM_READOUTS = [
  { label: "Visitor range", value: "42 cm" },
  { label: "Presence fusion", value: "Locked" },
  { label: "Ambient spill", value: "Low" },
  { label: "Clap window", value: "2 peaks" },
];

const LINK_RACK = [
  { label: "MQTT bus", value: "18 ms", status: "Stable", tone: "good" },
  { label: "SSL tunnel", value: "TLS 1.3", status: "Secured", tone: "accent" },
  { label: "ESP32 node", value: "Online", status: "Pulse live", tone: "good" },
  { label: "Spotify sync", value: "Placeholder", status: "Soft linked", tone: "soft" },
];

const MODE_MEMORY = [
  { name: "Focus", stamp: "19:39", note: "Low chatter / low glare", color: "#7fb8ff" },
  { name: "Casual", stamp: "19:12", note: "Open room / warm mix", color: "#d3a36b" },
  { name: "Party", stamp: "18:54", note: "Clap lock / neon spill", color: "#d86fff" },
];

const CLAP_TRACE = [18, 26, 34, 42, 58, 81, 96, 74, 40, 22, 16, 30, 56, 84, 100, 76, 44, 24];

const EVENT_TAPE = [
  { time: "19:42:06", action: "Double clap pulse registered", meta: "Threshold 0.82" },
  { time: "19:41:54", action: "Presence fusion held for 12 s", meta: "42 cm front lock" },
  { time: "19:41:20", action: "Mode memory saved as Focus", meta: "Warm deck" },
  { time: "19:40:48", action: "MQTT heartbeat refreshed", meta: "Bus clean" },
];

export default function SignalBay({ onClose }: SignalBayProps) {
  return (
    <div className="signal-bay">
      <div className="signal-bay-frame">
        <div className="signal-bay-header">
          <div className="signal-bay-intro">
            <span className="signal-bay-kicker">Secondary deck</span>
            <h2 className="signal-bay-title">Signal Bay</h2>
            <p className="signal-bay-description">
              Hidden room telemetry and system traces, styled as a backstage
              service deck instead of a generic dashboard.
            </p>
          </div>

          <div className="signal-bay-aside">
            <button
              type="button"
              className="signal-bay-close"
              onClick={onClose}
              aria-label="Close Signal Bay"
            >
              Close
            </button>

            <div className="signal-bay-summary">
              <span className="signal-bay-badge">Sketch data live</span>
              <div className="signal-bay-levels">
                {SIGNAL_LEVELS.map((level) => (
                  <div key={level.label} className="signal-bay-level">
                    <span className="signal-bay-level-label">{level.label}</span>
                    <div className="signal-bay-level-track">
                      <span
                        className="signal-bay-level-fill"
                        style={{ width: `${level.value}%` }}
                      />
                    </div>
                    <span className="signal-bay-level-value">{level.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="signal-bay-grid">
          <article className="bay-panel room-pulse-panel">
            <div className="bay-panel-head">
              <div>
                <span className="bay-panel-kicker">Room Pulse</span>
                <h3 className="bay-panel-title">Presence field</h3>
              </div>
              <span className="bay-panel-meta">42 cm lock</span>
            </div>

            <div className="room-pulse-layout">
              <div className="room-radar">
                {Array.from({ length: 4 }, (_, index) => (
                  <span
                    key={index}
                    className="room-radar-ring"
                    style={{ inset: `${12 + index * 24}px` }}
                  />
                ))}
                <span className="room-radar-cross room-radar-cross-x" />
                <span className="room-radar-cross room-radar-cross-y" />
                <span className="room-radar-sweep" />
                <span className="room-radar-core" />

                {ROOM_MARKERS.map((marker) => (
                  <div
                    key={marker.id}
                    className={`room-radar-marker tone-${marker.tone}`}
                    style={{
                      transform: `translate(-50%, -50%) rotate(${marker.angle}deg) translateY(-${marker.radius}px)`,
                    }}
                  >
                    <span className="room-radar-dot" />
                    <span
                      className="room-radar-label"
                      style={{ transform: `rotate(${-marker.angle}deg)` }}
                    >
                      {marker.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="room-pulse-readouts">
                {ROOM_READOUTS.map((item) => (
                  <div key={item.label} className="room-pulse-readout">
                    <span className="room-pulse-readout-label">{item.label}</span>
                    <strong className="room-pulse-readout-value">
                      {item.value}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="bay-panel link-rack-panel">
            <div className="bay-panel-head">
              <div>
                <span className="bay-panel-kicker">Link Rack</span>
                <h3 className="bay-panel-title">System lanes</h3>
              </div>
              <span className="bay-panel-meta">4 relays</span>
            </div>

            <div className="link-rack-list">
              {LINK_RACK.map((item) => (
                <div
                  key={item.label}
                  className="link-rack-item"
                  data-tone={item.tone}
                >
                  <span className="link-rack-led" />
                  <div className="link-rack-copy">
                    <span className="link-rack-label">{item.label}</span>
                    <strong className="link-rack-value">{item.value}</strong>
                  </div>
                  <span className="link-rack-status">{item.status}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="bay-panel clap-trace-panel">
            <div className="bay-panel-head">
              <div>
                <span className="bay-panel-kicker">Clap Trace</span>
                <h3 className="bay-panel-title">Transient capture</h3>
              </div>
              <span className="bay-panel-meta">Twin hit</span>
            </div>

            <div className="clap-trace-surface">
              <div className="clap-trace-wave">
                {CLAP_TRACE.map((bar, index) => (
                  <span
                    key={`${bar}-${index}`}
                    className="clap-trace-bar"
                    style={{
                      height: `${bar}%`,
                      animationDelay: `${index * 80}ms`,
                    }}
                  />
                ))}
              </div>

              <div className="clap-trace-meta">
                <div className="clap-trace-meta-item">
                  <span>Trigger</span>
                  <strong>Double clap</strong>
                </div>
                <div className="clap-trace-meta-item">
                  <span>Decay</span>
                  <strong>0.84 s</strong>
                </div>
                <div className="clap-trace-meta-item">
                  <span>Noise floor</span>
                  <strong>-28 dB</strong>
                </div>
              </div>
            </div>
          </article>

          <article className="bay-panel mode-memory-panel">
            <div className="bay-panel-head">
              <div>
                <span className="bay-panel-kicker">Mode Memory</span>
                <h3 className="bay-panel-title">Recent states</h3>
              </div>
              <span className="bay-panel-meta">3 recalls</span>
            </div>

            <div className="mode-memory-list">
              {MODE_MEMORY.map((mode) => (
                <div key={mode.name} className="mode-memory-item">
                  <span
                    className="mode-memory-swatch"
                    style={{
                      backgroundColor: mode.color,
                      boxShadow: `0 0 18px ${mode.color}`,
                    }}
                  />
                  <div className="mode-memory-copy">
                    <div className="mode-memory-row">
                      <strong>{mode.name}</strong>
                      <span>{mode.stamp}</span>
                    </div>
                    <p>{mode.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="bay-panel event-tape-panel">
            <div className="bay-panel-head">
              <div>
                <span className="bay-panel-kicker">Event Tape</span>
                <h3 className="bay-panel-title">Recent actions</h3>
              </div>
              <span className="bay-panel-meta">Last 4 events</span>
            </div>

            <div className="event-tape-list">
              {EVENT_TAPE.map((event, index) => (
                <div
                  key={`${event.time}-${event.action}`}
                  className="event-tape-item"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <span className="event-tape-time">{event.time}</span>
                  <div className="event-tape-copy">
                    <strong>{event.action}</strong>
                    <span>{event.meta}</span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
