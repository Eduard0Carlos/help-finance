"use client";

import { useEffect, useState } from "react";

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: string;
}

export function ProgressRing({
  value,
  max,
  size = 120,
  strokeWidth = 8,
  label,
  sublabel,
  color = "#00d4aa",
}: ProgressRingProps) {
  const [currentSize, setCurrentSize] = useState(size);

  useEffect(() => {
    const updateSize = () => {
      if (window.innerWidth < 640) {
        setCurrentSize(Math.min(size, 96));
        return;
      }
      setCurrentSize(size);
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [size]);

  const radius = (currentSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(1, value / max);
  const offset = circumference * (1 - pct);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: currentSize, height: currentSize }}>
      <svg
        width={currentSize}
        height={currentSize}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={currentSize / 2}
          cy={currentSize / 2}
          r={radius}
          fill="none"
          stroke="#2a2a3e"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={currentSize / 2}
          cy={currentSize / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        {label && <span className="text-white text-xs font-semibold leading-tight">{label}</span>}
        {sublabel && <span className="text-[#9ca3af] text-[10px] leading-tight">{sublabel}</span>}
      </div>
    </div>
  );
}
