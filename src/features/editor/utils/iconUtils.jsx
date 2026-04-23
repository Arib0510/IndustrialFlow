import React from 'react';

export const getSymbolImagePath = (type, colorHex) => {
  const cMap = {
    '#3B82F6': 'Blue', '#EF4444': 'Red', '#10B981': 'Green',
    '#22C55E': 'Green', '#F59E0B': 'Yellow', '#64748B': 'Gray', '#CBD5E1': 'Gray'
  };
  const color = cMap[(colorHex || '').toUpperCase()] || 'Blue';

  switch(type) {
    case 'tank_level': return `/HMISymbols/Tanks/Tanks Large/Tank1 ${color} Front.png`;
    case 'motor_status': return `/HMISymbols/Pumps/Pumps Large/Pump ${color} Right.png`;
    case 'valve_control': return `/HMISymbols/Valves/Valves Large/Valve1 ${color}.png`;
    case 'pipe_horz': return `/HMISymbols/Pipes/Pipes Large/Pipe ${color} Horz.png`;
    case 'pipe_vert': return `/HMISymbols/Pipes/Pipes Large/Pipe ${color} Vert.png`;
    case 'elbow_br': return `/HMISymbols/Elbows/Elbows Large/Elbow ${color} BottomRight.png`;
    default: return null;
  }
};

export const SCADA_SVG_PATHS = {
  scadavis_symbol: 'M 10,90 L 10,50 L 30,30 L 30,50 L 50,30 L 50,50 L 70,30 L 70,50 L 90,30 L 90,90 Z M 75,30 L 75,10 L 85,10 L 85,30 M 55,40 L 55,15 L 60,15 L 60,35 M 40,90 L 40,65 L 60,65 L 60,90 Z',
  breaker_symbol: 'M 30,5 L 30,25 M 70,5 L 70,25 M 20,25 L 80,25 L 80,75 L 20,75 Z M 30,75 L 30,95 M 70,75 L 70,95 M 20,40 L 80,40 M 20,50 L 80,50 M 20,60 L 80,60 M 45,35 m 0,0 a 5,5 0 1,0 10,0 a 5,5 0 1,0 -10,0',
  disconnector_symbol: 'M 50,5 L 50,20 M 40,20 L 60,20 L 60,30 L 40,30 Z M 50,80 L 50,95 M 40,70 L 60,70 L 60,80 L 40,80 Z M 50,70 L 75,35 M 70,30 m 0,0 a 3,3 0 1,0 6,0 a 3,3 0 1,0 -6,0 M 50,70 m -4,0 a 4,4 0 1,0 8,0 a 4,4 0 1,0 -8,0',
  ground_symbol: 'M 50,10 L 50,50 M 20,50 L 80,50 M 35,65 L 65,65 M 45,80 L 55,80'
};

export const ScadaIcons = {
  Facility: ({ size, color }) => <svg viewBox="0 0 100 100" width={size} height={size}><path d={SCADA_SVG_PATHS.scadavis_symbol} fill={color} stroke="currentColor" strokeWidth="4" strokeLinejoin="round" /></svg>,
  Breaker: ({ size, color }) => <svg viewBox="0 0 100 100" width={size} height={size}><path d={SCADA_SVG_PATHS.breaker_symbol} fill="none" stroke={color} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" /></svg>,
  Disconnector: ({ size, color }) => <svg viewBox="0 0 100 100" width={size} height={size}><path d={SCADA_SVG_PATHS.disconnector_symbol} fill="none" stroke={color} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" /></svg>,
  Ground: ({ size, color }) => <svg viewBox="0 0 100 100" width={size} height={size}><path d={SCADA_SVG_PATHS.ground_symbol} fill="none" stroke={color} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" /></svg>,
  Gauge: ({ size, color }) => <svg viewBox="0 0 100 100" width={size} height={size}><circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="6"/><path d="M 20 80 A 40 40 0 0 1 80 80" fill="none" stroke={color} strokeWidth="8"/><line x1="50" y1="50" x2="30" y2="30" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/><circle cx="50" cy="50" r="6" fill="currentColor"/></svg>,
  Toggle: ({ size, color }) => <svg viewBox="0 0 100 100" width={size} height={size}><rect x="10" y="30" width="80" height="40" rx="20" fill="none" stroke="currentColor" strokeWidth="6"/><circle cx="30" cy="50" r="12" fill={color}/></svg>,
  Slider: ({ size, color }) => <svg viewBox="0 0 100 100" width={size} height={size}><rect x="40" y="10" width="20" height="80" rx="10" fill="none" stroke="currentColor" strokeWidth="6"/><rect x="30" y="40" width="40" height="20" rx="4" fill={color}/></svg>,
  LCD: ({ size, color }) => <svg viewBox="0 0 100 100" width={size} height={size}><rect x="10" y="25" width="80" height="50" rx="5" fill="none" stroke="currentColor" strokeWidth="6"/><text x="50" y="60" fill={color} fontSize="35" fontFamily="monospace" textAnchor="middle" fontWeight="bold">0.0</text></svg>,
  Temp: ({ size, color }) => <svg viewBox="0 0 100 100" width={size} height={size}><rect x="35" y="10" width="30" height="60" rx="15" fill="none" stroke="currentColor" strokeWidth="6"/><circle cx="50" cy="75" r="20" fill="none" stroke="currentColor" strokeWidth="6"/><circle cx="50" cy="75" r="10" fill={color}/><line x1="50" y1="75" x2="50" y2="40" stroke={color} strokeWidth="8" strokeLinecap="round"/></svg>,
  LED: ({ size, color }) => <svg viewBox="0 0 100 100" width={size} height={size}><circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="6"/><circle cx="50" cy="50" r="25" fill={color}/></svg>,
  Battery: ({ size, color }) => <svg viewBox="0 0 100 100" width={size} height={size}><rect x="15" y="25" width="60" height="50" rx="5" fill="none" stroke="currentColor" strokeWidth="6"/><rect x="75" y="40" width="10" height="20" fill="currentColor"/><rect x="25" y="35" width="40" height="30" fill={color}/></svg>,
  Alert: ({ size, color }) => <svg viewBox="0 0 100 100" width={size} height={size}><polygon points="50,10 90,85 10,85" fill="none" stroke={color} strokeWidth="8" strokeLinejoin="round"/><line x1="50" y1="35" x2="50" y2="60" stroke={color} strokeWidth="6" strokeLinecap="round"/><circle cx="50" cy="75" r="4" fill={color}/></svg>,
  Text: ({ size, color }) => <svg viewBox="0 0 100 100" width={size} height={size}><text x="50" y="70" fill="currentColor" fontSize="70" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">A</text></svg>,
  Progress: ({ size, color }) => <svg viewBox="0 0 100 100" width={size} height={size}><rect x="10" y="35" width="80" height="30" rx="5" fill="none" stroke="currentColor" strokeWidth="6"/><rect x="15" y="40" width="50" height="20" fill={color}/></svg>,
  LineChart: ({ size, color }) => <svg viewBox="0 0 100 100" width={size} height={size}><polyline points="10,90 30,50 60,60 90,20" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/><polyline points="10,10 10,90 90,90" fill="none" stroke="currentColor" strokeWidth="6"/></svg>,
  BarChart: ({ size, color }) => <svg viewBox="0 0 100 100" width={size} height={size}><rect x="20" y="50" width="15" height="40" fill={color}/><rect x="45" y="20" width="15" height="70" fill={color}/><rect x="70" y="60" width="15" height="30" fill={color}/><polyline points="10,10 10,90 90,90" fill="none" stroke="currentColor" strokeWidth="6"/></svg>,
  DevicePLC: ({ size, color }) => <svg viewBox="0 0 100 100" width={size} height={size}><rect x="10" y="20" width="80" height="60" rx="5" fill="none" stroke="currentColor" strokeWidth="6"/><line x1="30" y1="20" x2="30" y2="80" stroke="currentColor" strokeWidth="6"/><circle cx="20" cy="35" r="5" fill={color}/><circle cx="20" cy="50" r="5" fill={color}/><circle cx="20" cy="65" r="5" fill={color}/><rect x="45" y="35" width="30" height="10" fill="none" stroke="currentColor" strokeWidth="4"/><rect x="45" y="55" width="30" height="10" fill="none" stroke="currentColor" strokeWidth="4"/></svg>,
  DatabaseTag: ({ size, color }) => <svg viewBox="0 0 100 100" width={size} height={size}><ellipse cx="50" cy="25" rx="35" ry="15" fill="none" stroke={color} strokeWidth="6"/><path d="M 15 25 L 15 75 A 35 15 0 0 0 85 75 L 85 25" fill="none" stroke={color} strokeWidth="6"/><path d="M 15 50 A 35 15 0 0 0 85 50" fill="none" stroke={color} strokeWidth="6"/></svg>,
  LayersHMI: ({ size, color }) => <svg viewBox="0 0 100 100" width={size} height={size}><polygon points="50,15 90,35 50,55 10,35" fill="none" stroke={color} strokeWidth="6" strokeLinejoin="round"/><polygon points="10,55 50,75 90,55" fill="none" stroke={color} strokeWidth="6" strokeLinejoin="round"/><polygon points="10,75 50,95 90,75" fill="none" stroke={color} strokeWidth="6" strokeLinejoin="round"/></svg>
};
