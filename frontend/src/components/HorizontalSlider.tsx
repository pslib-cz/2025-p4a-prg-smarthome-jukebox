import { useCallback, useRef } from "react";

interface HorizontalSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export default function HorizontalSlider({
  label,
  value,
  onChange,
}: HorizontalSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const track = trackRef.current;
      if (!track) return;

      const updateValue = (clientX: number) => {
        const rect = track.getBoundingClientRect();
        const relX = clientX - rect.left;
        const pct = Math.max(0, Math.min(100, (relX / rect.width) * 100));
        onChange(Math.round(pct));
      };

      updateValue(e.clientX);

      const handleMouseMove = (ev: MouseEvent) => updateValue(ev.clientX);
      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [onChange],
  );

  return (
    <div className="effect-slider">
      <div className="effect-header">
        <span className="effect-name">{label}</span>
        <span className="effect-value">{value}%</span>
      </div>
      <div
        className="effect-track"
        ref={trackRef}
        onMouseDown={handleMouseDown}
      >
        <div className="effect-fill" style={{ width: `${value}%` }} />
        <div className="effect-thumb" style={{ left: `${value}%` }} />
      </div>
    </div>
  );
}
