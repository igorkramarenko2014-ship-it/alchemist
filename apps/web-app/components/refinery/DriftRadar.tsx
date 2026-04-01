"use client";

import React from "react";

interface DriftRadarProps {
  data: Array<{
    parameter: string;
    drift: number;
    budgetOccupancy: number; // 0-1
  }>;
}

export function DriftRadar({ data }: DriftRadarProps) {
  const size = 300;
  const center = size / 2;
  const radius = (size / 2) - 40;
  const budgetLimit = 0.04;

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-[0_0_15px_rgba(94,234,212,0.15)]">
        {/* Concentric Budget Rings */}
        <circle cx={center} cy={center} r={radius * 0.25} fill="none" stroke="white/5" strokeWidth="1" strokeDasharray="2,2" />
        <circle cx={center} cy={center} r={radius * 0.5} fill="none" stroke="white/5" strokeWidth="1" strokeDasharray="2,2" />
        <circle cx={center} cy={center} r={radius * 0.75} fill="none" stroke="white/10" strokeWidth="1" strokeDasharray="4,4" />
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#5EEAD4" strokeWidth="2" strokeOpacity="0.3" />
        <text x={center} y={center - radius - 10} textAnchor="middle" className="text-[9px] fill-teal-400 font-mono uppercase tracking-tighter">±0.04 Budget</text>

        {/* Parameter Segments */}
        {data.map((point, i) => {
          const angle = (i / data.length) * 2 * Math.PI - Math.PI / 2;
          const x = center + Math.cos(angle) * radius * point.budgetOccupancy;
          const y = center + Math.sin(angle) * radius * point.budgetOccupancy;
          const labelX = center + Math.cos(angle) * (radius + 20);
          const labelY = center + Math.sin(angle) * (radius + 20);

          const color = point.budgetOccupancy > 0.95 ? "#f87171" : point.budgetOccupancy > 0.8 ? "#fb923c" : "#5EEAD4";
          const isAtLimit = point.budgetOccupancy > 0.95;

          return (
            <g key={point.parameter}>
              {/* Spoke */}
              <line x1={center} y1={center} x2={labelX} y2={labelY} stroke="white/5" strokeWidth="1" />
              
              {/* Point */}
              <circle cx={x} cy={y} r={isAtLimit ? "6" : "4"} fill={color} className={isAtLimit ? "animate-ping" : "animate-pulse"} />
              <circle cx={x} cy={y} r={isAtLimit ? "6" : "4"} fill={color} />
              <line x1={center} y1={center} x2={x} y2={y} stroke={color} strokeWidth={isAtLimit ? "3" : "2"} strokeOpacity="0.5" />
              
              {/* Label */}
              <text x={labelX} y={labelY} textAnchor="middle" className={`text-[8px] font-mono ${isAtLimit ? "fill-red-400 font-black" : "fill-gray-400"}`}>
                {point.parameter.split(":")[1] || point.parameter}
              </text>
            </g>
          );
        })}

        {data.some(p => p.budgetOccupancy > 0.95) && (
          <g transform={`translate(${center}, ${center})`}>
             <rect x="-80" y="-15" width="160" height="30" rx="15" fill="#f87171" className="animate-bounce" />
             <text textAnchor="middle" y="5" className="text-[9px] font-black fill-black uppercase tracking-widest">Budget Limit Reached</text>
          </g>
        )}
      </svg>
      
      <div className="mt-4 flex gap-4">
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-400" />
            <span className="text-[10px] text-gray-500 uppercase tracking-tighter">Safe</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-[10px] text-gray-500 uppercase tracking-tighter">Budget Limit</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-[10px] text-gray-500 uppercase tracking-tighter">Refused</span>
         </div>
      </div>
    </div>
  );
}
