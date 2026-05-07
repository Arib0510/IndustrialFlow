import React from 'react';

export const getSymbolImagePath = (_type, _colorHex) => null;

// ── JointJS standard.Path SVG paths (100×100 coordinate space) ──────────────
// All pipe paths use two-rail (wall) schematic representation.
// Lines only — no closed subpaths — so fill colour has no effect.
export const SCADA_SVG_PATHS = {

  // ── Facility silhouette ───────────────────────────────────────────────────
  scadavis_symbol:
    'M 5,95 L 5,62 L 20,44 L 20,60 L 40,38 L 60,38 L 60,60 L 78,44 L 95,62 L 95,95 Z ' +
    'M 68,38 L 68,10 L 78,10 L 78,38 ' +
    'M 42,38 L 42,24 L 48,24 L 48,38 ' +
    'M 32,95 L 32,72 L 52,72 L 52,95 Z',

  // ── Electrical symbols ────────────────────────────────────────────────────

  // Circuit breaker — two terminal circles + open contact blade
  breaker_symbol:
    'M 50,5 L 50,36 ' +
    'M 44,36 a 6,6 0 1,0 12,0 a 6,6 0 1,0 -12,0 ' +
    'M 44,64 a 6,6 0 1,0 12,0 a 6,6 0 1,0 -12,0 ' +
    'M 50,64 L 50,95 ' +
    'M 56,40 L 70,60',

  // Disconnector / isolator — open tilted blade
  disconnector_symbol:
    'M 50,5 L 50,36 ' +
    'M 44,36 a 6,6 0 1,0 12,0 a 6,6 0 1,0 -12,0 ' +
    'M 44,68 a 6,6 0 1,0 12,0 a 6,6 0 1,0 -12,0 ' +
    'M 50,68 L 50,95 ' +
    'M 56,38 L 82,22',

  // Earth ground — three decreasing bars
  ground_symbol:
    'M 50,8 L 50,42 ' +
    'M 14,42 L 86,42 ' +
    'M 26,58 L 74,58 ' +
    'M 38,74 L 62,74',

  // Transformer — two stacked winding circles with terminals
  transformer_symbol:
    'M 50,5 L 50,20 ' +
    'M 36,30 a 14,14 0 1,0 28,0 a 14,14 0 1,0 -28,0 ' +
    'M 36,68 a 14,14 0 1,0 28,0 a 14,14 0 1,0 -28,0 ' +
    'M 50,82 L 50,95',

  // Fuse — rectangle body with X mark and terminals
  fuse_symbol:
    'M 50,5 L 50,26 ' +
    'M 26,26 L 74,26 L 74,74 L 26,74 Z ' +
    'M 26,26 L 74,74 M 74,26 L 26,74 ' +
    'M 50,74 L 50,95',

  // Bus bar — thick horizontal rail with tap lines
  bus_bar:
    'M 2,46 L 98,46 M 2,54 L 98,54 ' +
    'M 2,46 L 2,54 M 98,46 L 98,54 ' +
    'M 20,54 L 20,80 M 20,80 L 16,80 M 20,80 L 24,80 ' +
    'M 50,54 L 50,80 M 50,80 L 46,80 M 50,80 L 54,80 ' +
    'M 80,54 L 80,80 M 80,80 L 76,80 M 80,80 L 84,80',

  // ── Piping & Routing ─────────────────────────────────────────────────────
  // Two-rail schematic: each path segment is one pipe wall.
  // Corners are mitered (sharp) using connected L commands.

  // Horizontal pipe — two rails + end flanges
  pipe_horz:
    'M 0,36 L 100,36 M 0,64 L 100,64 M 0,36 L 0,64 M 100,36 L 100,64',

  // Vertical pipe — two rails + end flanges
  pipe_vert:
    'M 36,0 L 36,100 M 64,0 L 64,100 M 36,0 L 64,0 M 36,100 L 64,100',

  // Elbow BR — enters from left, exits downward (bottom-right corner)
  elbow_br:
    'M 0,36 L 64,36 L 64,100 M 0,64 L 36,64 L 36,100 ' +
    'M 0,36 L 0,64 M 36,100 L 64,100',

  // Elbow BL — enters from right, exits downward (bottom-left corner)
  elbow_bl:
    'M 100,36 L 36,36 L 36,100 M 100,64 L 64,64 L 64,100 ' +
    'M 100,36 L 100,64 M 36,100 L 64,100',

  // Elbow TR — enters from left, exits upward (top-right corner)
  elbow_tr:
    'M 0,64 L 64,64 L 64,0 M 0,36 L 36,36 L 36,0 ' +
    'M 0,36 L 0,64 M 36,0 L 64,0',

  // Elbow TL — enters from right, exits upward (top-left corner)
  elbow_tl:
    'M 100,64 L 36,64 L 36,0 M 100,36 L 64,36 L 64,0 ' +
    'M 100,36 L 100,64 M 36,0 L 64,0',

  // T-junction horizontal — main L-R pipe, branch exits downward
  pipe_tee_h:
    'M 0,36 L 100,36 ' +
    'M 0,64 L 36,64 L 36,100 ' +
    'M 100,64 L 64,64 L 64,100 ' +
    'M 0,36 L 0,64 M 100,36 L 100,64 M 36,100 L 64,100',

  // T-junction vertical — main T-B pipe, branch exits rightward
  pipe_tee_v:
    'M 36,0 L 36,100 ' +
    'M 64,0 L 64,36 L 100,36 ' +
    'M 64,100 L 64,64 L 100,64 ' +
    'M 36,0 L 64,0 M 36,100 L 64,100 M 100,36 L 100,64',

  // Cross junction — horizontal and vertical pipes crossing
  pipe_cross:
    'M 0,36 L 36,36 L 36,0 ' +
    'M 64,0 L 64,36 L 100,36 ' +
    'M 100,64 L 64,64 L 64,100 ' +
    'M 36,100 L 36,64 L 0,64 ' +
    'M 0,36 L 0,64 M 100,36 L 100,64 M 36,0 L 64,0 M 36,100 L 64,100',
};

// ── Toolbox sidebar icons (24×24 viewBox) ────────────────────────────────────
const ic = (children) =>
  ({ size, color }) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
         stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {children(color)}
    </svg>
  );

export const ScadaIcons = {

  // ── Industrial Nodes ─────────────────────────────────────────────────────

  Tank: ic(color => <>
    <rect x="5" y="4" width="14" height="17" rx="1.5" />
    <rect x="5.75" y="13" width="12.5" height="7.25" rx="0 0 0.75 0.75" fill={color} opacity="0.25" stroke="none" />
    <line x1="5" y1="13" x2="19" y2="13" stroke={color} strokeWidth="1" />
    <line x1="9"  y1="4"  x2="9"  y2="2"  />
    <line x1="15" y1="4"  x2="15" y2="2"  />
    <line x1="1"  y1="21" x2="4"  y2="21" />
    <line x1="20" y1="21" x2="23" y2="21" />
  </>),

  Pump: ic(color => <>
    <circle cx="12" cy="13" r="7" />
    <path d="M 12 13 L 12 7 A 6 6 0 0 1 17.2 10.5 Z" fill={color} opacity="0.5" stroke="none" />
    <path d="M 12 13 L 17.2 10.5 A 6 6 0 0 1 17.2 15.5 Z" fill={color} opacity="0.35" stroke="none" />
    <path d="M 12 13 L 17.2 15.5 A 6 6 0 0 1 12 19 Z" fill={color} opacity="0.5" stroke="none" />
    <path d="M 12 13 L 12 19 A 6 6 0 0 1 6.8 15.5 Z" fill={color} opacity="0.35" stroke="none" />
    <path d="M 12 13 L 6.8 15.5 A 6 6 0 0 1 6.8 10.5 Z" fill={color} opacity="0.5" stroke="none" />
    <path d="M 12 13 L 6.8 10.5 A 6 6 0 0 1 12 7 Z" fill={color} opacity="0.35" stroke="none" />
    <circle cx="12" cy="13" r="2" fill={color} stroke="none" />
    <line x1="12" y1="6" x2="12" y2="3" />
    <line x1="5"  y1="13" x2="2" y2="13" />
  </>),

  Valve: ic(color => <>
    <polygon points="3,5 3,19 12,12" fill={color} opacity="0.35" stroke={color} strokeWidth="1.5" />
    <polygon points="21,5 21,19 12,12" fill={color} opacity="0.35" stroke={color} strokeWidth="1.5" />
    <line x1="12" y1="5"  x2="12" y2="2"  />
    <rect x="9" y="0.5" width="6" height="2.5" rx="0.5" strokeWidth="1" />
    <line x1="1"  y1="12" x2="3"  y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
  </>),

  Progress: ic(color => <>
    <rect x="2" y="9" width="20" height="6" rx="1.5" />
    <rect x="3"   y="10" width="3.5" height="4" rx="0.5" fill={color} stroke="none" />
    <rect x="7.5" y="10" width="3.5" height="4" rx="0.5" fill={color} stroke="none" />
    <rect x="12"  y="10" width="3.5" height="4" rx="0.5" fill={color} stroke="none" />
    <rect x="16.5" y="10" width="2.8" height="4" rx="0.5" fill={color} opacity="0.18" stroke="none" />
  </>),

  Facility: ic(color => <>
    <path d="M 2 21 L 2 13 L 6 9 L 6 13 L 10 7 L 14 7 L 14 13 L 18 9 L 22 13 L 22 21 Z" fill={color} opacity="0.15" />
    <path d="M 2 21 L 2 13 L 6 9 L 6 13 L 10 7 L 14 7 L 14 13 L 18 9 L 22 13 L 22 21 Z" />
    <line x1="16" y1="7"  x2="16" y2="3" />
    <line x1="19" y1="3"  x2="13" y2="3" />
    <rect x="9" y="14" width="6" height="7" rx="0.5" />
  </>),

  // ── Piping & Routing ──────────────────────────────────────────────────────

  PipeH: ic(_color => <>
    <line x1="1"  y1="9"  x2="23" y2="9"  strokeWidth="2" />
    <line x1="1"  y1="15" x2="23" y2="15" strokeWidth="2" />
    <line x1="1"  y1="9"  x2="1"  y2="15" strokeWidth="2" />
    <line x1="23" y1="9"  x2="23" y2="15" strokeWidth="2" />
  </>),

  PipeV: ic(_color => <>
    <line x1="9"  y1="1"  x2="9"  y2="23" strokeWidth="2" />
    <line x1="15" y1="1"  x2="15" y2="23" strokeWidth="2" />
    <line x1="9"  y1="1"  x2="15" y2="1"  strokeWidth="2" />
    <line x1="9"  y1="23" x2="15" y2="23" strokeWidth="2" />
  </>),

  // Elbow BR — enters left, exits downward
  Elbow: ic(_color => <>
    <polyline points="1,9 15,9 15,23" strokeWidth="2" fill="none" />
    <polyline points="1,15 9,15 9,23" strokeWidth="2" fill="none" />
    <line x1="1"  y1="9"  x2="1"  y2="15" strokeWidth="2" />
    <line x1="9"  y1="23" x2="15" y2="23" strokeWidth="2" />
  </>),

  // Elbow BL — enters right, exits downward
  ElbowBL: ic(_color => <>
    <polyline points="23,9 9,9 9,23" strokeWidth="2" fill="none" />
    <polyline points="23,15 15,15 15,23" strokeWidth="2" fill="none" />
    <line x1="23" y1="9"  x2="23" y2="15" strokeWidth="2" />
    <line x1="9"  y1="23" x2="15" y2="23" strokeWidth="2" />
  </>),

  // Elbow TR — enters left, exits upward
  ElbowTR: ic(_color => <>
    <polyline points="1,15 15,15 15,1" strokeWidth="2" fill="none" />
    <polyline points="1,9 9,9 9,1" strokeWidth="2" fill="none" />
    <line x1="1"  y1="9"  x2="1"  y2="15" strokeWidth="2" />
    <line x1="9"  y1="1"  x2="15" y2="1"  strokeWidth="2" />
  </>),

  // Elbow TL — enters right, exits upward
  ElbowTL: ic(_color => <>
    <polyline points="23,15 9,15 9,1" strokeWidth="2" fill="none" />
    <polyline points="23,9 15,9 15,1" strokeWidth="2" fill="none" />
    <line x1="23" y1="9"  x2="23" y2="15" strokeWidth="2" />
    <line x1="9"  y1="1"  x2="15" y2="1"  strokeWidth="2" />
  </>),

  // T-junction — main horizontal, branch downward
  TeeH: ic(_color => <>
    <line x1="1"  y1="9"  x2="23" y2="9"  strokeWidth="2" />
    <polyline points="1,15 9,15 9,23" strokeWidth="2" fill="none" />
    <polyline points="23,15 15,15 15,23" strokeWidth="2" fill="none" />
    <line x1="1"  y1="9"  x2="1"  y2="15" strokeWidth="2" />
    <line x1="23" y1="9"  x2="23" y2="15" strokeWidth="2" />
    <line x1="9"  y1="23" x2="15" y2="23" strokeWidth="2" />
  </>),

  // T-junction — main vertical, branch rightward
  TeeV: ic(_color => <>
    <line x1="9"  y1="1"  x2="9"  y2="23" strokeWidth="2" />
    <polyline points="15,1 15,9 23,9" strokeWidth="2" fill="none" />
    <polyline points="15,23 15,15 23,15" strokeWidth="2" fill="none" />
    <line x1="9"  y1="1"  x2="15" y2="1"  strokeWidth="2" />
    <line x1="9"  y1="23" x2="15" y2="23" strokeWidth="2" />
    <line x1="23" y1="9"  x2="23" y2="15" strokeWidth="2" />
  </>),

  // 4-way cross junction
  Cross: ic(_color => <>
    <line x1="1"  y1="9"  x2="9"  y2="9"  strokeWidth="2" />
    <line x1="1"  y1="15" x2="9"  y2="15" strokeWidth="2" />
    <line x1="15" y1="9"  x2="23" y2="9"  strokeWidth="2" />
    <line x1="15" y1="15" x2="23" y2="15" strokeWidth="2" />
    <line x1="9"  y1="1"  x2="9"  y2="9"  strokeWidth="2" />
    <line x1="15" y1="1"  x2="15" y2="9"  strokeWidth="2" />
    <line x1="9"  y1="15" x2="9"  y2="23" strokeWidth="2" />
    <line x1="15" y1="15" x2="15" y2="23" strokeWidth="2" />
    <line x1="1"  y1="9"  x2="1"  y2="15" strokeWidth="2" />
    <line x1="23" y1="9"  x2="23" y2="15" strokeWidth="2" />
    <line x1="9"  y1="1"  x2="15" y2="1"  strokeWidth="2" />
    <line x1="9"  y1="23" x2="15" y2="23" strokeWidth="2" />
  </>),

  // ── Electrical Substation ─────────────────────────────────────────────────

  Breaker: ic(color => <>
    <line x1="12" y1="2"  x2="12" y2="9"  />
    <line x1="12" y1="15" x2="12" y2="22" />
    <circle cx="12" cy="9"  r="2" fill={color} opacity="0.7" stroke={color} strokeWidth="1" />
    <circle cx="12" cy="15" r="2" fill="none" stroke={color} strokeWidth="1" />
    <line x1="13.4" y1="11" x2="17" y2="14" stroke={color} strokeWidth="1.75" />
  </>),

  Disconnector: ic(color => <>
    <line x1="12" y1="2"  x2="12" y2="9"  />
    <line x1="12" y1="16" x2="12" y2="22" />
    <circle cx="12" cy="9"  r="2" fill={color} opacity="0.7" stroke={color} strokeWidth="1" />
    <circle cx="12" cy="16" r="2" fill="none" stroke={color} strokeWidth="1" />
    <line x1="13.4" y1="10.5" x2="20" y2="7" stroke={color} strokeWidth="1.75" />
  </>),

  // Two stacked winding circles with top/bottom terminals
  Transformer: ic(color => <>
    <line x1="12" y1="2"  x2="12" y2="6"  />
    <circle cx="12" cy="9"  r="3" fill={color} opacity="0.15" strokeWidth="1.25" />
    <circle cx="12" cy="15" r="3" fill={color} opacity="0.15" strokeWidth="1.25" />
    <line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth="0.75" opacity="0.5" />
    <line x1="12" y1="18" x2="12" y2="22" />
  </>),

  // Rectangle body with X (IEC fuse symbol)
  Fuse: ic(color => <>
    <line x1="12" y1="2"  x2="12" y2="7"  />
    <rect x="7" y="7" width="10" height="10" rx="1" fill={color} opacity="0.12" />
    <line x1="7"  y1="7"  x2="17" y2="17" stroke={color} strokeWidth="1.25" />
    <line x1="17" y1="7"  x2="7"  y2="17" stroke={color} strokeWidth="1.25" />
    <line x1="12" y1="17" x2="12" y2="22" />
  </>),

  // Thick horizontal bus with tap lines
  BusBar: ic(color => <>
    <line x1="2"  y1="12" x2="22" y2="12" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <line x1="2"  y1="9"  x2="2"  y2="15" strokeWidth="2" />
    <line x1="22" y1="9"  x2="22" y2="15" strokeWidth="2" />
    <line x1="7"  y1="12" x2="7"  y2="18" strokeWidth="1.5" />
    <line x1="12" y1="12" x2="12" y2="18" strokeWidth="1.5" />
    <line x1="17" y1="12" x2="17" y2="18" strokeWidth="1.5" />
  </>),

  Ground: ic(color => <>
    <line x1="12" y1="3"  x2="12" y2="11" strokeWidth="2" />
    <line x1="4"  y1="11" x2="20" y2="11" strokeWidth="2"    stroke={color} />
    <line x1="7"  y1="15" x2="17" y2="15" strokeWidth="1.75" stroke={color} />
    <line x1="10" y1="19" x2="14" y2="19" strokeWidth="1.5"  stroke={color} />
  </>),

  // ── Controls & Displays ───────────────────────────────────────────────────

  Gauge: ic(color => <>
    <circle cx="12" cy="13" r="9" />
    <path d="M 5 19 A 9 9 0 1 1 19 19" strokeWidth="1" opacity="0.3" />
    <path d="M 5 19 A 9 9 0 0 1 9.5 6.5" stroke={color} strokeWidth="2" />
    <line x1="12" y1="13" x2="8.5" y2="7.5" stroke={color} strokeWidth="1.5" />
    <circle cx="12" cy="13" r="1.5" fill={color} stroke="none" />
  </>),

  Toggle: ic(color => <>
    <rect x="3" y="8" width="18" height="8" rx="4" />
    <circle cx="17" cy="12" r="3" fill={color} stroke="none" />
    <line x1="7"  y1="10.5" x2="9"  y2="10.5" strokeWidth="1" opacity="0.5" />
    <line x1="7"  y1="13.5" x2="9"  y2="13.5" strokeWidth="1" opacity="0.5" />
  </>),

  Slider: ic(color => <>
    <line x1="3"  y1="12" x2="21" y2="12" strokeWidth="2" />
    <line x1="4"  y1="8"  x2="4"  y2="16" strokeWidth="2" />
    <line x1="20" y1="8"  x2="20" y2="11" />
    <line x1="20" y1="13" x2="20" y2="16" />
    <rect x="11" y="8" width="4" height="8" rx="2" fill={color} opacity="0.8" stroke={color} strokeWidth="1" />
  </>),

  LCD: ic(color => <>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <text x="12" y="16" textAnchor="middle" fontSize="7.5" fill={color}
          fontFamily="monospace" fontWeight="700" stroke="none">88.8</text>
  </>),

  Temp: ic(color => <>
    <rect x="9" y="3" width="6" height="13" rx="3" />
    <circle cx="12" cy="18" r="3.5" />
    <rect x="10.5" y="13" width="3" height="5" fill={color} opacity="0.7" stroke="none" />
    <circle cx="12" cy="18" r="2" fill={color} stroke="none" />
    <line x1="15" y1="7"  x2="17" y2="7"  />
    <line x1="15" y1="10" x2="17" y2="10" />
  </>),

  // ── Status & Alerts ───────────────────────────────────────────────────────

  LED: ic(color => <>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="5"  fill={color} opacity="0.8" stroke="none" />
    <circle cx="10" cy="10" r="1.5" fill="white" opacity="0.45" stroke="none" />
  </>),

  Battery: ic(color => <>
    <rect x="2" y="7" width="17" height="10" rx="1.5" />
    <rect x="19" y="10" width="3" height="4" rx="1" fill="currentColor" stroke="none" />
    <rect x="3.5" y="8.5" width="11" height="7" rx="0.75" fill={color} opacity="0.55" stroke="none" />
  </>),

  Alert: ic(color => <>
    <polygon points="12,3 21,19 3,19" stroke={color} strokeWidth="1.5" fill={color} opacity="0.12" />
    <line x1="12" y1="9"  x2="12" y2="14" stroke={color} strokeWidth="2" />
    <circle cx="12" cy="17" r="1.25" fill={color} stroke="none" />
  </>),

  Text: ic(_color => <>
    <text x="12" y="17" textAnchor="middle" fontSize="15" fill="currentColor"
          fontFamily="sans-serif" fontWeight="900" stroke="none">A</text>
    <line x1="4" y1="20" x2="20" y2="20" strokeWidth="1.5" />
  </>),

  // ── Analytics ─────────────────────────────────────────────────────────────

  LineChart: ic(color => <>
    <line x1="3"  y1="4"  x2="3"  y2="20" />
    <line x1="3"  y1="20" x2="21" y2="20" />
    <polyline points="4,17 8,11 12,13 16,7 21,9"
              fill="none" stroke={color} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" />
  </>),

  BarChart: ic(color => <>
    <line x1="3"  y1="3"  x2="3"  y2="21" />
    <line x1="3"  y1="21" x2="21" y2="21" />
    <rect x="5"  y="13" width="4" height="8" fill={color} opacity="0.65" stroke="none" />
    <rect x="11" y="7"  width="4" height="14" fill={color} stroke="none" />
    <rect x="17" y="11" width="4" height="10" fill={color} opacity="0.65" stroke="none" />
  </>),

  // Backward-compat aliases
  get DevicePLC()  { return this.Facility; },
  get DatabaseTag(){ return this.LCD;      },
  get LayersHMI()  { return this.Facility; },
};
