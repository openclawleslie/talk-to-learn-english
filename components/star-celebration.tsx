"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Star } from "lucide-react";

type Props = {
  stars: number; // 1-3
  onClose: () => void;
};

const NOTES: Record<number, number> = { 1: 523.25, 2: 659.25, 3: 783.99 }; // C5, E5, G5
const STAR_DELAY = 600; // ms between each star

function playNote(freq: number) {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);

    // Overtone at octave above
    const gain2 = ctx.createGain();
    gain2.connect(ctx.destination);
    gain2.gain.setValueAtTime(0.045, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = freq * 2;
    osc2.connect(gain2);
    osc2.start();
    osc2.stop(ctx.currentTime + 0.8);

    setTimeout(() => ctx.close(), 1200);
  } catch {
    // Web Audio not supported — silent fallback
  }
}

const SPARKLE_OFFSETS = [
  { x: -20, y: -30 }, { x: 20, y: -30 }, { x: -30, y: 0 },
  { x: 30, y: 0 }, { x: -20, y: 25 }, { x: 20, y: 25 },
];

const MESSAGES: Record<number, string> = {
  3: "太棒了！",
  2: "做得好！",
  1: "繼續加油！",
};

export function StarCelebration({ stars, onClose }: Props) {
  const [visibleStars, setVisibleStars] = useState(0);
  const [showMessage, setShowMessage] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const close = useCallback(() => {
    clearTimeout(timerRef.current);
    onClose();
  }, [onClose]);

  useEffect(() => {
    let count = 0;
    const reveal = () => {
      count++;
      setVisibleStars(count);
      playNote(NOTES[count]);
      if (count < stars) {
        timerRef.current = setTimeout(reveal, STAR_DELAY);
      } else {
        timerRef.current = setTimeout(() => setShowMessage(true), 400);
        // Auto-close 2s after last star
        timerRef.current = setTimeout(close, 2000 + 400);
      }
    };
    timerRef.current = setTimeout(reveal, 300);
    return () => clearTimeout(timerRef.current);
  }, [stars, close]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/50"
      style={{ animation: "fade-in 0.3s ease-out" }}
      onClick={close}
    >
      <div className="flex gap-6 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="relative">
            <Star
              className={`h-16 w-16 transition-opacity ${
                i <= visibleStars
                  ? "fill-warning text-warning opacity-100"
                  : "text-white/20 opacity-40"
              }`}
              style={
                i <= visibleStars
                  ? { animation: "star-entrance 0.5s ease-out, star-glow 1.5s ease-in-out 0.5s infinite" }
                  : undefined
              }
            />
            {/* Sparkle particles */}
            {i <= visibleStars &&
              SPARKLE_OFFSETS.map((offset, idx) => (
                <span
                  key={idx}
                  className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-warning"
                  style={{
                    animation: "sparkle-fly 0.7s ease-out forwards",
                    ["--tx" as string]: `${offset.x}px`,
                    ["--ty" as string]: `${offset.y}px`,
                  }}
                />
              ))}
          </div>
        ))}
      </div>
      {showMessage && (
        <p
          className="text-2xl font-bold text-white drop-shadow-lg"
          style={{ animation: "fade-in 0.4s ease-out" }}
        >
          {MESSAGES[stars] ?? MESSAGES[1]}
        </p>
      )}
    </div>
  );
}
