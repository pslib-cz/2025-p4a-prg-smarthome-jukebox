import AudioVisualizer from "./AudioVisualizer";

interface VinylRecordProps {
  coverUrl: string;
  isPlaying: boolean;
  spinDuration: number;
  theme: "casual" | "disco" | "focus" | "eco";
  /** Optional Web Audio AnalyserNode for live audio visualization */
  analyser?: AnalyserNode | null;
  /** Optional pre-processed audio values for direct visualizer control */
  frequencyData?:
    | Uint8Array<ArrayBufferLike>
    | Float32Array<ArrayBufferLike>
    | null;
}

const VINYL_SIZE = 320;

const THEME_COLOR_SCHEME: Record<
  VinylRecordProps["theme"],
  "warm" | "neon" | "cool" | "nature"
> = {
  casual: "warm",
  disco: "neon",
  focus: "cool",
  eco: "nature",
};

export default function VinylRecord({
  coverUrl,
  isPlaying,
  spinDuration,
  theme,
  analyser,
  frequencyData,
}: VinylRecordProps) {
  const grooves = [];
  for (let i = 0; i < 40; i++) {
    const size = 46 + i * 1.35;
    if (size > 98) continue;
    const isBright = i % 3 === 0;
    const opacity = isBright ? 0.07 : 0.035;
    grooves.push(
      <div
        key={i}
        className="vinyl-groove"
        style={{
          width: `${size}%`,
          height: `${size}%`,
          borderColor: `rgba(255, 255, 255, ${opacity})`,
          borderWidth: i % 5 === 0 ? "1.2px" : "0.7px",
        }}
      />,
    );
  }

  const shouldSpin = isPlaying && spinDuration > 0;

  return (
    <div className="vinyl-container">
      {/* Audio visualizer ring — sits behind the vinyl */}
      <AudioVisualizer
        isPlaying={isPlaying}
        vinylSize={VINYL_SIZE}
        colorScheme={THEME_COLOR_SCHEME[theme]}
        analyser={analyser}
        frequencyData={frequencyData}
      />

      <div
        className={`vinyl-record ${shouldSpin ? "spinning" : ""}`}
        style={
          shouldSpin ? { animationDuration: `${spinDuration}s` } : undefined
        }
      >
        <div className="vinyl-surface" />
        <div className="vinyl-grooves">{grooves}</div>
        <div className="vinyl-center">
          <img src={coverUrl} alt="Album cover" />
        </div>
        <div className="vinyl-dot" />
        <div className="vinyl-shine" />
      </div>
    </div>
  );
}
