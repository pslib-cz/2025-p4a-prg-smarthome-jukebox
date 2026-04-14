import type { AppShellStatusViewModel } from "../state/appShellStatus";
import "./AppStatusBanner.css";

interface AppStatusBannerProps {
  viewModel: AppShellStatusViewModel;
}

export default function AppStatusBanner({
  viewModel,
}: AppStatusBannerProps) {
  return (
    <div
      className="app-status-banner"
      data-tone={viewModel.tone}
      role="status"
      aria-live="polite"
    >
      <span className="app-status-pill">{viewModel.label}</span>

      <div className="app-status-copy">
        <strong>{viewModel.headline}</strong>
        <p>{viewModel.copy}</p>
      </div>

      <div className="app-status-chip-row">
        {viewModel.detailChips.map((chip) => (
          <span key={chip} className="app-status-chip">
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}
