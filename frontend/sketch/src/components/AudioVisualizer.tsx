import { useRef, useEffect, useMemo } from "react";

interface AudioVisualizerProps {
  isPlaying: boolean;
  /** Size of the vinyl record in px — visualizer ring wraps around it */
  vinylSize: number;
  /** Color scheme per theme: warm=casual, neon=disco, cool=focus, nature=eco */
  colorScheme: "warm" | "neon" | "cool" | "nature";
  /**
   * Optional Web Audio AnalyserNode for real audio visualization.
   * When provided, the visualizer reads live frequency data.
   * When absent, it falls back to simulated wave patterns.
   */
  analyser?: AnalyserNode | null;
  /**
   * Optional pre-processed audio data.
   * Float32Array values should be normalized to 0..1.
   * Uint8Array values are treated like FFT data in the 0..255 range.
   */
  frequencyData?:
    | Uint8Array<ArrayBufferLike>
    | Float32Array<ArrayBufferLike>
    | null;
}

/* ── Layout constants ─────────────────────────────────────────── */
/** Number of frequency bars around the circle */
const BAR_COUNT = 72;
/** How far bars start from the vinyl edge (gap in px) */
const GAP = 10;
/** Maximum bar height in px */
const MAX_BAR_HEIGHT = 27;
/** Bar width in px */
const BAR_WIDTH = 2.25;
const HALF_BAR = BAR_WIDTH / 2;
/** Small baseline so the ring feels continuous while active */
const MIN_BAR_HEIGHT = 1.7;
/** Number of discrete color steps in the LUT */
const COLOR_STEPS = 64;

/* ── Pre-computed trig lookup (never changes) ─────────────────── */
const barAngles = new Float64Array(BAR_COUNT);
const barCos = new Float64Array(BAR_COUNT);
const barSin = new Float64Array(BAR_COUNT);
for (let i = 0; i < BAR_COUNT; i++) {
  barAngles[i] = (i / BAR_COUNT) * Math.PI * 2 - Math.PI / 2;
  barCos[i] = Math.cos(barAngles[i]);
  barSin[i] = Math.sin(barAngles[i]);
}

/* ── Color LUT builder ────────────────────────────────────────── */
type ColorScheme = AudioVisualizerProps["colorScheme"];

function buildColorLUT(scheme: ColorScheme): string[] {
  const lut: string[] = new Array(COLOR_STEPS);
  for (let step = 0; step < COLOR_STEPS; step++) {
    const t = step / (COLOR_STEPS - 1);
    let r: number, g: number, b: number, a: number;

    switch (scheme) {
      case "neon":
        r = Math.round(155 + t * 80);
        g = Math.round(60 + t * 30);
        b = Math.round(220 + t * 35);
        a = 0.4 + t * 0.5;
        break;
      case "cool":
        r = Math.round(46 + t * 30);
        g = Math.round(140 + t * 50);
        b = Math.round(172 + t * 40);
        a = 0.35 + t * 0.5;
        break;
      case "nature":
        r = Math.round(45 + t * 40);
        g = Math.round(155 + t * 50);
        b = Math.round(80 + t * 30);
        a = 0.35 + t * 0.5;
        break;
      default: // warm
        r = Math.round(166 + t * 60);
        g = Math.round(124 + t * 30);
        b = Math.round(82 - t * 20);
        a = 0.35 + t * 0.45;
    }
    lut[step] = `rgba(${r},${g},${b},${a.toFixed(3)})`;
  }
  return lut;
}

/* ── Build glow color LUT (for the subtle glow behind bright bars) ── */
function buildGlowLUT(scheme: ColorScheme): string[] {
  const lut: string[] = new Array(COLOR_STEPS);
  for (let step = 0; step < COLOR_STEPS; step++) {
    const t = step / (COLOR_STEPS - 1);
    let r: number, g: number, b: number;

    switch (scheme) {
      case "neon":
        r = Math.round(155 + t * 80);
        g = Math.round(60 + t * 30);
        b = Math.round(220 + t * 35);
        break;
      case "cool":
        r = Math.round(46 + t * 30);
        g = Math.round(140 + t * 50);
        b = Math.round(172 + t * 40);
        break;
      case "nature":
        r = Math.round(45 + t * 40);
        g = Math.round(155 + t * 50);
        b = Math.round(80 + t * 30);
        break;
      default:
        r = Math.round(166 + t * 60);
        g = Math.round(124 + t * 30);
        b = Math.round(82 - t * 20);
    }
    // Glow is softer — lower alpha, used as shadowColor
    const a = t * 0.35;
    lut[step] = `rgba(${r},${g},${b},${a.toFixed(3)})`;
  }
  return lut;
}

/**
 * Map real FFT bins (from AnalyserNode) to our circular bar count.
 * Uses logarithmic binning so bass gets more visual weight (like a real EQ).
 */
function mapFFTToBars(
  fftData: Uint8Array<ArrayBuffer>,
  fftSize: number,
  output: Float32Array,
): void {
  // Only use first half of FFT (Nyquist), skip bin 0 (DC offset)
  const usableBins = fftSize / 2;
  const logMin = Math.log(1);
  const logMax = Math.log(usableBins);

  for (let i = 0; i < BAR_COUNT; i++) {
    // Logarithmic mapping: lower bars = bass (few bins), upper bars = treble (many bins)
    const t0 = i / BAR_COUNT;
    const t1 = (i + 1) / BAR_COUNT;
    const binStart = Math.floor(Math.exp(logMin + t0 * (logMax - logMin)));
    const binEnd = Math.max(
      binStart + 1,
      Math.floor(Math.exp(logMin + t1 * (logMax - logMin))),
    );

    let sum = 0;
    let count = 0;
    for (let b = binStart; b < binEnd && b < usableBins; b++) {
      sum += fftData[b];
      count++;
    }

    // Normalize 0–255 → 0–1, apply a slight power curve for punchier visuals
    const avg = count > 0 ? sum / count / 255 : 0;
    output[i] = Math.pow(avg, 0.8);
  }
}

function mapInputArrayToBars(
  input: Uint8Array<ArrayBufferLike> | Float32Array<ArrayBufferLike>,
  output: Float32Array,
): void {
  const sourceLength = input.length;
  const isByteData = input instanceof Uint8Array;

  const normalize = (value: number): number => {
    const raw = isByteData ? value / 255 : value;
    return Math.pow(Math.max(0, Math.min(1, raw)), 0.85);
  };

  if (sourceLength === 0) {
    output.fill(0);
    return;
  }

  if (sourceLength === BAR_COUNT) {
    for (let i = 0; i < BAR_COUNT; i++) {
      output[i] = normalize(input[i]);
    }
    return;
  }

  for (let i = 0; i < BAR_COUNT; i++) {
    const start = Math.floor((i / BAR_COUNT) * sourceLength);
    const end = Math.max(
      start + 1,
      Math.floor(((i + 1) / BAR_COUNT) * sourceLength),
    );

    let sum = 0;
    let count = 0;
    for (let index = start; index < end && index < sourceLength; index++) {
      sum += normalize(input[index]);
      count++;
    }

    output[i] = count > 0 ? sum / count : 0;
  }
}

/**
 * Generate simulated frequency data using layered sine waves.
 * This runs when no AnalyserNode is connected.
 */
function generateSimulatedData(t: number, output: Float32Array): void {
  for (let i = 0; i < BAR_COUNT; i++) {
    const angle = (i / BAR_COUNT) * Math.PI * 2;
    // Layer multiple sine waves for organic movement
    const bass = Math.sin(t * 2.1 + angle * 2) * 0.5 + 0.5;
    const mid = Math.sin(t * 3.7 + angle * 5 + 1.2) * 0.4 + 0.4;
    const high = Math.sin(t * 5.3 + angle * 8 + 2.8) * 0.3 + 0.3;
    const noise = Math.sin(t * 11 + i * 7.3) * 0.15;
    // Slow-moving wave envelope for the "breathing" feel
    const envelope =
      0.7 + 0.3 * Math.sin(t * 0.8 + angle * 1.5 + Math.sin(t * 0.3) * 2);
    output[i] = Math.max(
      0,
      Math.min(1, (bass * 0.5 + mid * 0.3 + high * 0.2 + noise) * envelope),
    );
  }
}

/**
 * Apply neighborhood smoothing to bar values for a wavy, organic look.
 * Each bar blends with its neighbors (circular wrapping).
 */
function smoothBars(data: Float32Array): void {
  // Two-pass smoothing with circular wrapping
  const tmp = new Float32Array(BAR_COUNT);
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < BAR_COUNT; i++) {
      const prev = (i - 1 + BAR_COUNT) % BAR_COUNT;
      const next = (i + 1) % BAR_COUNT;
      tmp[i] = data[prev] * 0.2 + data[i] * 0.6 + data[next] * 0.2;
    }
    tmp.forEach((v, i) => {
      data[i] = v;
    });
  }
}

/* ── Component ────────────────────────────────────────────────── */

/**
 * Circular audio visualizer ring that wraps around the vinyl record.
 *
 * Accepts an optional `analyser` (Web Audio AnalyserNode) for real audio.
 * Without it, renders smooth simulated wave patterns.
 *
 * To connect real audio:
 * ```ts
 * const audioCtx = new AudioContext();
 * const source = audioCtx.createMediaElementSource(audioElement);
 * const analyser = audioCtx.createAnalyser();
 * analyser.fftSize = 256;
 * analyser.smoothingTimeConstant = 0.75;
 * source.connect(analyser);
 * analyser.connect(audioCtx.destination);
 * // Then pass `analyser` prop to <AudioVisualizer analyser={analyser} />
 * ```
 */
export default function AudioVisualizer({
  isPlaying,
  vinylSize,
  colorScheme,
  analyser,
  frequencyData,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  /** Smoothed bar values currently displayed */
  const dataRef = useRef<Float32Array>(new Float32Array(BAR_COUNT));
  /** Target bar values we're interpolating toward */
  const targetRef = useRef<Float32Array>(new Float32Array(BAR_COUNT));
  const timeRef = useRef(0);
  const lastFrameTimeRef = useRef<number | null>(null);

  const colorLut = useMemo(() => buildColorLUT(colorScheme), [colorScheme]);
  const glowLut = useMemo(() => buildGlowLUT(colorScheme), [colorScheme]);

  // Reusable FFT buffer (allocated once, even if analyser changes)
  const fftBufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Canvas sizing — accommodate vinyl + ring
    const ringOuterRadius = vinylSize / 2 + GAP + MAX_BAR_HEIGHT;
    const canvasSize = ringOuterRadius * 2 + 20;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;
    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;
    ctx.scale(dpr, dpr);

    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;
    const innerRadius = vinylSize / 2 + GAP;
    const getColor = (intensity: number): string => {
      const idx = Math.min(
        COLOR_STEPS - 1,
        Math.max(0, Math.round(intensity * (COLOR_STEPS - 1))),
      );
      return colorLut[idx];
    };
    const getGlow = (intensity: number): string => {
      const idx = Math.min(
        COLOR_STEPS - 1,
        Math.max(0, Math.round(intensity * (COLOR_STEPS - 1))),
      );
      return glowLut[idx];
    };

    // Allocate FFT buffer if we have an analyser
    if (analyser && !fftBufferRef.current) {
      fftBufferRef.current = new Uint8Array(analyser.frequencyBinCount);
    }

    const animate = (now: number) => {
      const previousTime = lastFrameTimeRef.current ?? now;
      const deltaTime = Math.min(
        0.05,
        Math.max(0.008, (now - previousTime) / 1000),
      );
      lastFrameTimeRef.current = now;
      timeRef.current += deltaTime;
      ctx.clearRect(0, 0, canvasSize, canvasSize);

      /* ── 1. Acquire target data ── */
      const externalData = frequencyData;
      const hasExternalData = Boolean(externalData && externalData.length > 0);

      if (hasExternalData && externalData) {
        mapInputArrayToBars(externalData, targetRef.current);
      } else if (analyser) {
        // Real audio: read FFT frequency data
        if (
          !fftBufferRef.current ||
          fftBufferRef.current.length !== analyser.frequencyBinCount
        ) {
          fftBufferRef.current = new Uint8Array(analyser.frequencyBinCount);
        }
        analyser.getByteFrequencyData(fftBufferRef.current);
        mapFFTToBars(fftBufferRef.current, analyser.fftSize, targetRef.current);
      } else if (isPlaying) {
        // Simulated audio
        generateSimulatedData(timeRef.current, targetRef.current);
      } else {
        // Fade out
        targetRef.current.fill(0);
      }

      /* ── 2. Smooth interpolation ── */
      const lerpSpeed =
        analyser || hasExternalData || isPlaying
          ? Math.min(0.24, 0.09 + deltaTime * 7.5)
          : Math.min(0.12, 0.04 + deltaTime * 4);
      for (let i = 0; i < BAR_COUNT; i++) {
        dataRef.current[i] +=
          (targetRef.current[i] - dataRef.current[i]) * lerpSpeed;
      }

      // Apply neighborhood smoothing for organic wave shapes
      smoothBars(dataRef.current);

      /* ── 3. Draw the circular bar ring as the wave itself ── */
      const isActive = analyser || hasExternalData || isPlaying;
      for (let i = 0; i < BAR_COUNT; i++) {
        const prevIndex = (i - 1 + BAR_COUNT) % BAR_COUNT;
        const nextIndex = (i + 1) % BAR_COUNT;
        const waveValue =
          dataRef.current[prevIndex] * 0.18 +
          dataRef.current[i] * 0.64 +
          dataRef.current[nextIndex] * 0.18;

        if (!isActive && waveValue < 0.01) continue;

        const barHeight =
          (isActive ? MIN_BAR_HEIGHT : 0) + waveValue * MAX_BAR_HEIGHT;
        const cos = barCos[i];
        const sin = barSin[i];

        const startX = centerX + cos * innerRadius;
        const startY = centerY + sin * innerRadius;

        ctx.save();
        ctx.translate(startX, startY);
        ctx.rotate(barAngles[i] + Math.PI / 2);

        // Draw the rounded bar
        const x = -HALF_BAR;
        const y = 0;
        const w = BAR_WIDTH;
        const h = barHeight;
        const r = HALF_BAR;

        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();

        // Subtle glow for higher-intensity bars
        if (waveValue > 0.4) {
          ctx.shadowColor = getGlow(waveValue);
          ctx.shadowBlur = 4 + waveValue * 7;
        }

        ctx.globalAlpha = isActive ? 0.28 + waveValue * 0.7 : waveValue * 0.4;
        ctx.fillStyle = getColor(waveValue);
        ctx.fill();

        // Reset shadow so it doesn't leak
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        ctx.restore();
      }

      let hasVisibleEnergy = false;
      for (let i = 0; i < BAR_COUNT; i++) {
        if (dataRef.current[i] > 0.01 || targetRef.current[i] > 0.01) {
          hasVisibleEnergy = true;
          break;
        }
      }

      if (analyser || hasExternalData || isPlaying || hasVisibleEnergy) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = 0;
        lastFrameTimeRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
      lastFrameTimeRef.current = null;
    };
  }, [isPlaying, vinylSize, analyser, frequencyData, colorLut, glowLut]);

  return (
    <canvas ref={canvasRef} className="audio-visualizer" aria-hidden="true" />
  );
}
