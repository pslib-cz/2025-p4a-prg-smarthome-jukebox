import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  color: string;
  pulseSpeed: number;
  pulsePhase: number;
  blur: number;
  /** Pre-rendered sprite canvas for this particle's blur level & color */
  sprite: HTMLCanvasElement | null;
}

const VIBE_COLORS = [
  "rgba(155, 89, 247, VAL)", // purple
  "rgba(200, 64, 255, VAL)", // magenta
  "rgba(108, 99, 255, VAL)", // blue-purple
  "rgba(236, 72, 153, VAL)", // pink
  "rgba(139, 92, 246, VAL)", // violet
  "rgba(99, 179, 255, VAL)", // light blue
];

/**
 * Pre-render a blurred circle into a small offscreen canvas.
 * Drawing this cached image each frame is GPU-friendly, while
 * applying `ctx.filter = blur(...)` every frame is extremely expensive.
 */
function createParticleSprite(
  size: number,
  blur: number,
  baseColor: string,
): HTMLCanvasElement {
  // The sprite needs extra room for the blur spread
  const padding = Math.ceil(blur * 3);
  const spriteSize = Math.ceil(size * 2 + padding * 2);

  const offscreen = document.createElement("canvas");
  offscreen.width = spriteSize;
  offscreen.height = spriteSize;

  const ctx = offscreen.getContext("2d");
  if (ctx) {
    ctx.filter = `blur(${blur}px)`;
    ctx.beginPath();
    ctx.arc(spriteSize / 2, spriteSize / 2, size, 0, Math.PI * 2);
    // Use full opacity for the sprite; we modulate alpha via globalAlpha at draw time
    ctx.fillStyle = baseColor.replace("VAL", "1");
    ctx.fill();
  }

  return offscreen;
}

function createParticle(): Particle {
  const color = VIBE_COLORS[Math.floor(Math.random() * VIBE_COLORS.length)];
  const size = 2 + Math.random() * 4;
  const blur = 1 + Math.random() * 3;

  return {
    x: Math.random() * 100,
    y: Math.random() * 100,
    size,
    opacity: 0,
    color,
    pulseSpeed: 0.3 + Math.random() * 0.7,
    pulsePhase: Math.random() * Math.PI * 2,
    blur,
    sprite: null, // lazily created below
  };
}

const PARTICLE_COUNT = 35;

export default function DiscoParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Create particles and pre-render their sprites
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => {
      const p = createParticle();
      p.sprite = createParticleSprite(p.size, p.blur, p.color);
      return p;
    });

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const animate = (time: number) => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const t = time / 1000;

      for (const p of particlesRef.current) {
        // Pulsing opacity
        const pulse = Math.sin(t * p.pulseSpeed * Math.PI * 2 + p.pulsePhase);
        const alpha = 0.15 + 0.35 * ((pulse + 1) / 2);

        const x = (p.x / 100) * w;
        const y = (p.y / 100) * h;

        if (p.sprite) {
          const spriteW = p.sprite.width;
          const spriteH = p.sprite.height;
          ctx.globalAlpha = alpha;
          ctx.drawImage(p.sprite, x - spriteW / 2, y - spriteH / 2);
        }
      }
      ctx.globalAlpha = 1;

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="disco-particles" />;
}
