import { useCallback, useRef } from "react";

interface VerticalFaderProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export default function VerticalFader({
  icon,
  label,
  value,
  onChange,
}: VerticalFaderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const track = trackRef.current;
      if (!track) return;

      const updateValue = (clientY: number) => {
        const rect = track.getBoundingClientRect();
        const relY = rect.bottom - clientY;
        const pct = Math.max(0, Math.min(100, (relY / rect.height) * 100));
        onChange(Math.round(pct));
      };

      updateValue(e.clientY);

      const handleMouseMove = (ev: MouseEvent) => updateValue(ev.clientY);
      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [onChange],
  );

  const fillHeight = `${value}%`;
  const thumbBottom = `calc(${value}% - 9px)`;

  return (
    <div className="slider-channel">
      <span className="slider-icon">{icon}</span>
      <div
        className="fader-wrapper"
        ref={trackRef}
        onMouseDown={handleMouseDown}
      >
        <div className="fader-track">
          <div className="fader-fill" style={{ height: fillHeight }} />
        </div>
        <div className="fader-thumb" style={{ bottom: thumbBottom }} />
      </div>
      <span className="slider-value">{value}%</span>
      <span className="slider-label">{label}</span>
    </div>
  );
}
