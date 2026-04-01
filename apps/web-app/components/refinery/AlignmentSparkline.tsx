"use client";

import React from "react";

interface AlignmentSparklineProps {
  values: number[];
  width?: number;
  height?: number;
}

export function AlignmentSparkline({ values, width = 120, height = 40 }: AlignmentSparklineProps) {
  if (values.length < 2) return <div className="text-[10px] text-gray-500 uppercase">Wait...</div>;

  const min = 0;
  const max = 1;
  const step = width / (values.length - 1);
  
  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / (max - min)) * height;
    return `${x},${y}`;
  }).join(" ");

  const lastValue = values[values.length - 1];
  const color = lastValue > 0.7 ? "#5EEAD4" : lastValue > 0.5 ? "#fb923ce6" : "#f87171e6";

  return (
    <div className="flex items-center gap-2">
      <svg width={width} height={height} className="overflow-visible opacity-80 filter drop-shadow-[0_0_8px_rgba(94,234,212,0.3)]">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className="transition-all duration-1000"
        />
        {/* Glow point */}
        <circle 
          cx={width} 
          cy={height - ((lastValue - min) / (max - min)) * height} 
          r="3" 
          fill={color} 
          className="animate-ping"
        />
      </svg>
      <div className={`text-[10px] font-mono font-bold ${lastValue > 0.7 ? "text-teal-400" : "text-orange-400"}`}>
        {(lastValue * 100).toFixed(0)}%
      </div>
    </div>
  );
}
