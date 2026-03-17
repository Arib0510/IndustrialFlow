import React, { useContext } from 'react';
import { SCADAContext } from '../../context/SCADAContext';

export const GaugeWidget = ({ node }) => {
  const { tags, isDarkMode } = useContext(SCADAContext);
  
  // Retrieve real-time data
  const tagKey = node.boundTag || node.tagKey;
  const currentValue = (tagKey && tags[tagKey]) ? Number(tags[tagKey].value) : 0;
  
  // Customization props from Inspector
  const color = node.color || '#3B82F6';
  const name = node.name || 'Analog Gauge';
  const unit = node.unit || '';

  // Constrain value between 0 and 100 for the angle calculation
  const percent = Math.max(0, Math.min(100, currentValue));
  
  // Sweep from -135 degrees to +135 degrees (270 degree physical sweep)
  const angle = -135 + (percent * 2.7);

  const textColor = isDarkMode ? '#f8fafc' : '#0f172a';
  const trackColor = isDarkMode ? '#334155' : '#cbd5e1';

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-2 relative pointer-events-none">
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" style={{ overflow: 'visible' }}>
        
        {/* Outer Bezel */}
        <circle cx="50" cy="50" r="48" fill={isDarkMode ? '#0f172a' : '#ffffff'} stroke="#475569" strokeWidth="1.5" />
        <circle cx="50" cy="50" r="44" fill="transparent" stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} strokeWidth="4" />
        
        {/* Background Track (270 degrees) */}
        <path d="M 20 80 A 40 40 0 1 1 80 80" fill="none" stroke={trackColor} strokeWidth="6" strokeLinecap="round" />
        
        {/* Colored Industrial Danger/Safe Zones (Tick Marks) */}
        <path d="M 20 80 A 40 40 0 0 1 20 20" fill="none" stroke="#22C55E" strokeWidth="2" strokeDasharray="3 5" />
        <path d="M 20 20 A 40 40 0 0 1 80 20" fill="none" stroke="#F59E0B" strokeWidth="2" strokeDasharray="3 5" />
        <path d="M 80 20 A 40 40 0 0 1 80 80" fill="none" stroke="#EF4444" strokeWidth="2" strokeDasharray="3 5" />

        {/* Hardware Needle */}
        <g transform={`rotate(${angle} 50 50)`} style={{ transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
          {/* Needle shadow */}
          <polygon points="48,52 52,52 50,17" fill="rgba(0,0,0,0.3)" />
          {/* Needle body */}
          <polygon points="48,50 52,50 50,15" fill={color} />
          {/* Center Pin */}
          <circle cx="50" cy="50" r="5" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="2" fill="#475569" />
        </g>

        {/* Digital Value Text Overlay */}
        <text x="50" y="72" textAnchor="middle" fill={textColor} fontSize="16" fontWeight="bold" fontFamily="monospace">
          {Math.round(currentValue)}
        </text>
        <text x="50" y="82" textAnchor="middle" fill="#64748b" fontSize="8" fontWeight="bold" letterSpacing="1">
          {unit}
        </text>
      </svg>
      
      {/* Engraved Label */}
      <div className="absolute bottom-2 w-full text-center text-[9px] font-bold uppercase tracking-widest truncate px-2" style={{ color: '#64748b' }}>
        {name}
      </div>
    </div>
  );
};