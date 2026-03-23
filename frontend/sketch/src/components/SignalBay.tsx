import type { CSSProperties } from "react";
import type { MediaState, TelemetryState } from "../state/jukeboxTypes";
import type { AppShellStatusViewModel } from "../state/appShellStatus";
import AppStatusBanner from "./AppStatusBanner";
import "./SignalBay.css";
import "./SignalBayPanels.css";
import "./SignalBayTelemetry.css";
import "./SignalBayMotion.css";
import { DSP_PROFILES, ROOM_MARKERS } from "./signalBayData";
import {
  buildBufferLevels,
  buildDistanceChartPoints,
  buildSignalBayViewModel,
} from "./signalBayViewModel";

interface SignalBayProps {
  onClose: () => void;
  telemetry: TelemetryState;
  media: MediaState;
  activeDspProfile: string;
  appStatus: AppShellStatusViewModel;
}

const CHART_WIDTH = 360;
const CHART_HEIGHT = 180;
const CHART_PADDING_X = 18;
const CHART_PADDING_Y = 20;

function PresenceGauge({
  confidencePercent,
  reason,
}: {
  confidencePercent: number;
  reason: string;
}) {
  return (
    <div className="presence-gauge-card">
      <div
        className="presence-gauge"
        style={
          {
            "--presence-value": `${confidencePercent}%`,
          } as CSSProperties
        }
      >
        <div className="presence-gauge-inner">
          <strong>{confidencePercent}%</strong>
          <span>Presence</span>
        </div>
      </div>

      <div className="presence-gauge-copy">
        <span className="presence-gauge-label">Fusion confidence</span>
        <strong>{reason}</strong>
        <p>ESP32 presence score is promoted only after the mobile beacon and distance lane agree.</p>
      </div>
    </div>
  );
}

function DistanceChart({
  distanceSeries,
}: {
  distanceSeries: TelemetryState["distanceSeries"];
}) {
  const chartPoints = buildDistanceChartPoints(distanceSeries);
  const linePoints = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints =
    chartPoints.length > 0
      ? [
          `${CHART_PADDING_X},${CHART_HEIGHT - CHART_PADDING_Y}`,
          ...chartPoints.map((point) => `${point.x},${point.y}`),
          `${CHART_WIDTH - CHART_PADDING_X},${CHART_HEIGHT - CHART_PADDING_Y}`,
        ].join(" ")
      : "";

  return (
    <div className="distance-chart-shell">
      <svg
        className="distance-chart"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label="Distance over time chart"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <line
            key={`grid-${index}`}
            className="distance-grid-line"
            x1={CHART_PADDING_X}
            x2={CHART_WIDTH - CHART_PADDING_X}
            y1={CHART_PADDING_Y + (index * (CHART_HEIGHT - CHART_PADDING_Y * 2)) / 3}
            y2={CHART_PADDING_Y + (index * (CHART_HEIGHT - CHART_PADDING_Y * 2)) / 3}
          />
        ))}

        {areaPoints ? <polygon className="distance-area" points={areaPoints} /> : null}
        {linePoints ? <polyline className="distance-line" points={linePoints} /> : null}

        {chartPoints.map((point, index) => (
          <circle
            key={`${point.time}-${point.value}`}
            className={`distance-dot ${index === chartPoints.length - 1 ? "is-active" : ""}`}
            cx={point.x}
            cy={point.y}
            r={index === chartPoints.length - 1 ? 5.5 : 4}
          />
        ))}
      </svg>

      <div className="distance-axis">
        {distanceSeries.map((point) => (
          <span key={point.time}>{point.time}</span>
        ))}
      </div>
    </div>
  );
}

function BufferMeter({ bufferPercent }: { bufferPercent: number }) {
  const bufferLevels = buildBufferLevels(bufferPercent);

  return (
    <div className="buffer-meter" aria-label="Audio buffer level">
      {bufferLevels.map((level, index) => (
        <span
          key={`${level}-${index}`}
          className={`buffer-meter-bar ${level >= 70 ? "is-stable" : ""}`}
          style={{ height: `${level}%` }}
        />
      ))}
    </div>
  );
}

export default function SignalBay({
  onClose,
  telemetry,
  media,
  activeDspProfile,
  appStatus,
}: SignalBayProps) {
  const viewModel = buildSignalBayViewModel(telemetry, media);
  const recentEvents = telemetry.eventLog.slice(0, 4);

  return (
    <div className="signal-bay">
      <div className="signal-bay-frame">
        <div className="signal-bay-header">
          <div className="signal-bay-intro">
            <span className="signal-bay-kicker">Technical deck</span>
            <h2 className="signal-bay-title">Telemetry Deck</h2>
            <p className="signal-bay-description">
              MQTT traffic, ESP32 health, presence fusion, and automation traces presented as the
              backstage system layer of the jukebox.
            </p>
          </div>

          <div className="signal-bay-header-cards">
            <div className="signal-bay-status-slot">
              <AppStatusBanner viewModel={appStatus} />
            </div>

            <div className="signal-bay-aside">
              <div className="signal-bay-summary">
                <div className="signal-bay-summary-head">
                  <span className="signal-bay-badge">P0 telemetry live</span>
                  <button
                    type="button"
                    className="signal-bay-close"
                    onClick={onClose}
                    aria-label="Close Telemetry Deck"
                  >
                    Close
                  </button>
                </div>

                <div className="signal-bay-levels">
                  {viewModel.signalLevels.map((level) => (
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

                <div className="signal-bay-summary-chips">
                  {viewModel.summaryChips.map((chip) => (
                    <span key={chip} className="signal-bay-summary-chip">
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="signal-bay-grid">
          <article className="bay-panel room-pulse-panel">
            <div className="bay-panel-head">
              <div>
                <span className="bay-panel-kicker">Presence Field</span>
                <h3 className="bay-panel-title">Sensor fusion</h3>
              </div>
              <span className="bay-panel-meta">
                {telemetry.presence.confidencePercent}% confidence
              </span>
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

              <div className="room-pulse-stack">
                <PresenceGauge
                  confidencePercent={telemetry.presence.confidencePercent}
                  reason={telemetry.presence.reason}
                />

                <div className="room-pulse-readouts">
                  {viewModel.roomReadouts.map((item) => (
                    <div key={item.label} className="room-pulse-readout">
                      <span className="room-pulse-readout-label">{item.label}</span>
                      <strong className="room-pulse-readout-value">{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>

          <article className="bay-panel system-health-panel">
            <div className="bay-panel-head">
              <div>
                <span className="bay-panel-kicker">System Health</span>
                <h3 className="bay-panel-title">Broker and edge node</h3>
              </div>
              <span className="bay-panel-meta">
                {telemetry.system.mqttStatus} / {telemetry.system.mqttSecurity}
              </span>
            </div>

            <div className="system-health-list">
              {viewModel.systemHealth.map((item) => (
                <div key={item.label} className="system-health-item" data-tone={item.tone}>
                  <span className="system-health-led" />
                  <div className="system-health-copy">
                    <span className="system-health-label">{item.label}</span>
                    <strong className="system-health-value">{item.value}</strong>
                  </div>
                  <span className="system-health-status">{item.status}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="bay-panel distance-trace-panel">
            <div className="bay-panel-head">
              <div>
                <span className="bay-panel-kicker">Distance Graph</span>
                <h3 className="bay-panel-title">Approach timeline</h3>
              </div>
              <span className="bay-panel-meta">{telemetry.distanceSeries.length} samples</span>
            </div>

            <DistanceChart distanceSeries={telemetry.distanceSeries} />

            <div className="distance-summary-grid">
              {viewModel.distanceSummary.map((item) => (
                <div key={item.label} className="distance-summary-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>

            <div className="clap-trace-strip" aria-label="Clap activity trace">
              {viewModel.clapTrace.map((bar, index) => (
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
          </article>

          <article className="bay-panel mqtt-terminal-panel">
            <div className="bay-panel-head">
              <div>
                <span className="bay-panel-kicker">MQTT Live Feed</span>
                <h3 className="bay-panel-title">Raw topic stream</h3>
              </div>
              <span className="bay-panel-meta">
                Broker jitter {telemetry.system.brokerLatency}
              </span>
            </div>

            <div className="mqtt-terminal">
              <div className="mqtt-terminal-topbar">
                <span className="mqtt-terminal-dot" />
                broker://home/jukebox/edge
              </div>

              <div className="mqtt-terminal-body">
                {telemetry.mqttFeed.map((entry, index) => (
                  <div
                    key={`${entry.direction}-${entry.topic}-${index}`}
                    className={`mqtt-line tone-${entry.tone}`}
                  >
                    <span className="mqtt-line-direction">[{entry.direction}]</span>
                    <span className="mqtt-line-topic">{entry.topic}</span>
                    <span className="mqtt-line-separator">:</span>
                    <span className="mqtt-line-payload">{entry.payload}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mqtt-topic-strip">
              {viewModel.mqttTopics.map((topic) => (
                <span key={topic} className="mqtt-topic-chip">
                  {topic}
                </span>
              ))}
            </div>
          </article>

          <article className="bay-panel automation-panel">
            <div className="bay-panel-head">
              <div>
                <span className="bay-panel-kicker">Traceability</span>
                <h3 className="bay-panel-title">Sensor to action lanes</h3>
              </div>
              <span className="bay-panel-meta">
                {telemetry.automationLanes.length} active rules
              </span>
            </div>

            <div className="automation-list">
              {telemetry.automationLanes.map((lane) => (
                <div key={lane.source} className="automation-item">
                  <div className="automation-step">
                    <span>Input</span>
                    <strong>{lane.source}</strong>
                  </div>
                  <span className="automation-arrow" aria-hidden="true">
                    →
                  </span>
                  <div className="automation-step">
                    <span>Fusion</span>
                    <strong>{lane.fusion}</strong>
                  </div>
                  <span className="automation-arrow" aria-hidden="true">
                    →
                  </span>
                  <div className="automation-step">
                    <span>Output</span>
                    <strong>{lane.action}</strong>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="bay-panel audio-pipeline-panel">
            <div className="bay-panel-head">
              <div>
                <span className="bay-panel-kicker">Audio Telemetry</span>
                <h3 className="bay-panel-title">Playback pipeline</h3>
              </div>
              <span className="bay-panel-meta">P1 technical</span>
            </div>

            <div className="audio-telemetry-grid">
              {viewModel.audioTelemetry.map((item) => (
                <div key={item.label} className="audio-telemetry-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  {item.label === "Buffer" ? (
                    <BufferMeter bufferPercent={media.audio.bufferPercent} />
                  ) : null}
                </div>
              ))}
            </div>

            <div className="dsp-profile-strip">
              {DSP_PROFILES.map((profile) => (
                <span
                  key={profile.label}
                  className={`dsp-profile-chip ${profile.label === activeDspProfile ? "is-active" : ""}`}
                >
                  {profile.label}
                </span>
              ))}
            </div>
          </article>

          <article className="bay-panel event-tape-panel">
            <div className="bay-panel-head">
              <div>
                <span className="bay-panel-kicker">Event Log</span>
                <h3 className="bay-panel-title">Human-readable actions</h3>
              </div>
              <span className="bay-panel-meta">Last {recentEvents.length} events</span>
            </div>

            <div className="event-tape-list">
              {recentEvents.map((event, index) => (
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
