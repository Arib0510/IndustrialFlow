import React, { useContext, useRef, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { SCADAContext } from "../../context/SCADAContext";
import { ResizeOverlay } from "./ResizeOverlay";
import { GaugeWidget } from "./GaugeWidget";

// ── Shared primitives ─────────────────────────────────────────────────────────

const Panel = ({ children, style, className = '', showBorder = true, bgColor }) => (
  <div className={className} style={{
    backgroundColor: bgColor || 'var(--bg-panel)',
    border: showBorder ? '1px solid var(--border)' : 'none',
    borderRadius: 'var(--radius-md)',
    boxShadow: showBorder ? 'var(--shadow-sm)' : 'none',
    overflow: 'hidden',
    ...style,
  }}>
    {children}
  </div>
);

const CardLabel = ({ children }) => (
  <div style={{
    fontSize: 9, fontWeight: 700, letterSpacing: '0.09em',
    textTransform: 'uppercase', color: 'var(--text-muted)',
    textAlign: 'center', padding: '6px 6px 2px',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  }}>
    {children}
  </div>
);

const statusColor = (val, low = 20, mid = 50) =>
  val > mid ? 'var(--status-ok)' : val > low ? 'var(--status-warn)' : 'var(--status-error)';

// ── Main overlay engine ───────────────────────────────────────────────────────

export const ReactWidgetOverlays = ({ graph, nodes, history, selectedCellId, paperRef }) => {
  const { tags, writeTag, isSimulating, isDarkMode } = useContext(SCADAContext);
  const transformRef = useRef(null);

  useEffect(() => {
    let animId;
    const sync = () => {
      if (paperRef?.current && transformRef.current) {
        const { sx, sy } = paperRef.current.scale();
        const { tx, ty } = paperRef.current.translate();
        transformRef.current.style.transform = `translate(${tx}px,${ty}px) scale(${sx},${sy})`;
      }
      animId = requestAnimationFrame(sync);
    };
    sync();
    return () => cancelAnimationFrame(animId);
  }, [paperRef]);

  const chartTooltipStyle = {
    backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)',
    fontSize: 10, color: 'var(--text-primary)',
  };

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
      <div ref={transformRef} style={{ position: 'absolute', top: 0, left: 0, transformOrigin: '0 0' }}>
        {nodes.map(nodeData => {
          if (nodeData.category === 'drawn_shape') return null;

          // ── Resolve tag value ───────────────────────────────────────────
          let rawVal = 0;
          const boundedKey = nodeData.boundTag || nodeData.tagKey;
          if (boundedKey && tags[boundedKey] !== undefined) rawVal = tags[boundedKey].value;

          // Apply optional scale/offset transform (for numeric widgets)
          const scale  = nodeData.tagScale  ?? 1;
          const offset = nodeData.tagOffset ?? 0;
          const val    = typeof rawVal === 'number' ? rawVal * scale + offset : rawVal;

          const pos   = nodeData.position || { x: 0, y: 0 };
          const size  = nodeData.size     || { width: 120, height: 80 };
          const angle = nodeData.angle    || 0;
          const color = nodeData.color    || '#3B82F6';
          const name  = nodeData.name     || '';
          const unit  = nodeData.unit     || '';

          // Widget appearance settings
          const showLabel  = nodeData.showLabel  !== false;
          const showBorder = nodeData.showBorder !== false;
          const bgColor    = nodeData.bgColor    || undefined;
          const decimals   = nodeData.decimals   ?? 1;

          const baseStyle = {
            position: 'absolute', left: pos.x, top: pos.y,
            width: size.width, height: size.height,
            transform: `rotate(${angle}deg)`, pointerEvents: 'none',
            opacity: nodeData.opacity ?? 1,
          };

          // ── Tank Level ────────────────────────────────────────────────────
          if (nodeData.category === 'tank_level') {
            const level = Math.max(0, Math.min(100, Number(val) || 0));
            const sc    = statusColor(level, 15, 30);
            const bodyH = 72;
            const fillH = (level / 100) * bodyH;
            const fillY = 6 + bodyH - fillH;

            return (
              <div key={nodeData.id} style={baseStyle}>
                <Panel style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 6px 6px' }} showBorder={showBorder} bgColor={bgColor}>
                  {showLabel && <CardLabel>{name}</CardLabel>}
                  <svg viewBox="0 0 60 90" style={{ flex: 1, width: '100%', overflow: 'visible' }}>
                    <rect x="8" y="6" width="44" height={bodyH} rx="2" stroke="var(--border)" strokeWidth="1.5" fill="var(--bg-subtle)" />
                    {fillH > 0 && (
                      <rect x="9.5" y={fillY} width="41" height={fillH} rx="1" fill={sc} opacity="0.22" />
                    )}
                    <line x1="9.5" y1={fillY} x2="50.5" y2={fillY} stroke={sc} strokeWidth="1" />
                    {[25, 50, 75].map(p => (
                      <line key={p} x1="8" y1={6 + (1 - p / 100) * bodyH} x2="13" y2={6 + (1 - p / 100) * bodyH} stroke="var(--text-muted)" strokeWidth="0.75" opacity="0.5" />
                    ))}
                    <line x1="2"  y1="68" x2="8"  y2="68" stroke="var(--border)" strokeWidth="2" />
                    <line x1="52" y1="68" x2="58" y2="68" stroke="var(--border)" strokeWidth="2" />
                    <text x="30" y="87" textAnchor="middle" fontSize="8" fill={sc} fontFamily="JetBrains Mono, Geist Mono, monospace" fontWeight="700">
                      {level.toFixed(decimals)}{unit || '%'}
                    </text>
                  </svg>
                </Panel>
              </div>
            );
          }

          // ── Motor / Pump ──────────────────────────────────────────────────
          if (nodeData.category === 'motor_status') {
            const running = !!val;
            const sc      = running ? 'var(--status-ok)' : 'var(--status-error)';

            return (
              <div key={nodeData.id} style={baseStyle}>
                <Panel style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6px' }} showBorder={showBorder} bgColor={bgColor}>
                  {showLabel && <CardLabel>{name}</CardLabel>}
                  <svg viewBox="0 0 60 60" style={{ width: '70%', height: 'auto' }}>
                    <circle cx="30" cy="30" r="22" stroke="var(--border)" strokeWidth="1.5" fill="var(--bg-subtle)" />
                    <g style={{ transformOrigin: '30px 30px', animation: running ? 'spin 1.2s linear infinite' : 'none' }}>
                      {[0, 60, 120, 180, 240, 300].map(deg => (
                        <rect key={deg} x="28" y="10" width="4" height="12" rx="2" fill={sc} opacity="0.6" transform={`rotate(${deg} 30 30)`} />
                      ))}
                    </g>
                    <circle cx="30" cy="30" r="6" fill="var(--bg-panel)" stroke="var(--border)" strokeWidth="1.5" />
                    <circle cx="30" cy="30" r="2" fill={sc} />
                    <line x1="30" y1="52" x2="30" y2="58" stroke="var(--border)" strokeWidth="2.5" />
                    <line x1="52" y1="30" x2="58" y2="30" stroke="var(--border)" strokeWidth="2.5" />
                  </svg>
                  <div style={{ fontSize: 9, fontWeight: 700, color: sc, marginTop: 4, letterSpacing: '0.05em' }}>
                    {running ? 'RUNNING' : 'STOPPED'}
                  </div>
                </Panel>
              </div>
            );
          }

          // ── Control Valve ─────────────────────────────────────────────────
          if (nodeData.category === 'valve_control') {
            const open = !!val;
            const sc   = open ? 'var(--status-ok)' : 'var(--status-error)';
            const opac = open ? 0.5 : 0.12;

            return (
              <div key={nodeData.id} style={baseStyle}>
                <Panel style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6px' }} showBorder={showBorder} bgColor={bgColor}>
                  {showLabel && <CardLabel>{name}</CardLabel>}
                  <svg viewBox="0 0 80 80" style={{ width: '85%', height: 'auto' }}>
                    <polygon points="8,14 8,66 40,40"  fill={sc} opacity={opac} stroke={sc} strokeWidth="1.5" strokeLinejoin="round" />
                    <polygon points="72,14 72,66 40,40" fill={sc} opacity={opac} stroke={sc} strokeWidth="1.5" strokeLinejoin="round" />
                    <line x1="40" y1="14" x2="40" y2="5" stroke="var(--border)" strokeWidth="2" />
                    <ellipse cx="40" cy="4" rx="8" ry="3" fill="none" stroke="var(--border)" strokeWidth="1.5" />
                    <line x1="1"  y1="40" x2="8"  y2="40" stroke="var(--border)" strokeWidth="3" />
                    <line x1="72" y1="40" x2="79" y2="40" stroke="var(--border)" strokeWidth="3" />
                  </svg>
                  <div style={{ fontSize: 9, fontWeight: 700, color: sc, marginTop: 2, letterSpacing: '0.05em' }}>
                    {open ? 'OPEN' : 'CLOSED'}
                  </div>
                </Panel>
              </div>
            );
          }

          // ── Capacity Bar ──────────────────────────────────────────────────
          if (nodeData.category === 'progress_bar') {
            const pct    = Math.max(0, Math.min(100, Number(val) || 0));
            const segs   = 10;
            const active = Math.round((pct / 100) * segs);

            return (
              <div key={nodeData.id} style={baseStyle}>
                <Panel style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '6px 10px' }} showBorder={showBorder} bgColor={bgColor}>
                  {showLabel && <CardLabel>{name}</CardLabel>}
                  <div style={{ display: 'flex', gap: 3, height: 18, padding: '0 2px' }}>
                    {Array.from({ length: segs }).map((_, i) => (
                      <div key={i} style={{
                        flex: 1, height: '100%', borderRadius: 2,
                        backgroundColor: i < active ? color : 'var(--bg-subtle)',
                        border: '1px solid var(--border)',
                        boxShadow: i < active ? `0 0 5px ${color}55` : 'none',
                        transition: 'background-color 0.3s',
                      }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, textAlign: 'right', marginTop: 4, fontFamily: 'JetBrains Mono, Geist Mono, monospace', color }}>
                    {Number(val).toFixed(decimals)} {unit}
                  </div>
                </Panel>
              </div>
            );
          }

          // ── Gauge Dial ────────────────────────────────────────────────────
          if (nodeData.category === 'gauge_dial') {
            return (
              <div key={nodeData.id} style={{ ...baseStyle, pointerEvents: 'auto' }}>
                <Panel style={{ width: '100%', height: '100%', borderRadius: '50%' }} showBorder={showBorder} bgColor={bgColor}>
                  <GaugeWidget node={nodeData} />
                </Panel>
              </div>
            );
          }

          // ── Digital Readout / LCD ─────────────────────────────────────────
          if (nodeData.category === 'digital_readout') {
            return (
              <div key={nodeData.id} style={baseStyle}>
                <Panel style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '4px 8px' }} showBorder={showBorder} bgColor={bgColor}>
                  {showLabel && <CardLabel>{name}</CardLabel>}
                  <div style={{
                    margin: '0 2px', padding: '5px 8px',
                    backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'JetBrains Mono, Geist Mono, monospace',
                    fontSize: 22, fontWeight: 700, color,
                    textAlign: 'center', letterSpacing: '0.04em',
                  }}>
                    {Number(val).toFixed(decimals)}
                    <span style={{ fontSize: 9, fontWeight: 400, opacity: 0.7, marginLeft: 4 }}>{unit}</span>
                  </div>
                </Panel>
              </div>
            );
          }

          // ── Numeric / Temp Display ────────────────────────────────────────
          if (nodeData.category === 'temp_display') {
            return (
              <div key={nodeData.id} style={baseStyle}>
                <Panel style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '4px 8px' }} showBorder={showBorder} bgColor={bgColor}>
                  {showLabel && <CardLabel>{name}</CardLabel>}
                  <div style={{ fontFamily: 'JetBrains Mono, Geist Mono, monospace', fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.01em' }}>
                    {typeof val === 'string' ? val : Number(val).toFixed(decimals)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{unit}</div>
                </Panel>
              </div>
            );
          }

          // ── Toggle Switch ─────────────────────────────────────────────────
          if (nodeData.category === 'toggle_switch') {
            const isON = !!val;
            const sc   = isON ? 'var(--status-ok)' : 'var(--text-muted)';

            return (
              <div key={nodeData.id} style={baseStyle}>
                <Panel style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px' }} showBorder={showBorder} bgColor={bgColor}>
                  <div>
                    {showLabel && <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{name}</div>}
                    <div style={{ fontSize: 11, fontWeight: 700, color: sc, marginTop: 2 }}>{isON ? 'ON' : 'OFF'}</div>
                  </div>
                  <div
                    onClick={e => { e.stopPropagation(); if (boundedKey) writeTag(boundedKey, !isON); }}
                    style={{
                      width: 44, height: 24, borderRadius: 12, flexShrink: 0,
                      backgroundColor: isON ? 'var(--status-ok)' : 'var(--bg-subtle)',
                      border: `1px solid ${isON ? 'var(--status-ok)' : 'var(--border)'}`,
                      position: 'relative', cursor: 'pointer',
                      transition: 'background-color 0.2s, border-color 0.2s',
                      pointerEvents: 'auto',
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 3, left: isON ? 23 : 3,
                      width: 16, height: 16, borderRadius: 8,
                      backgroundColor: 'white', boxShadow: 'var(--shadow-sm)',
                      transition: 'left 0.2s cubic-bezier(0.4,0,0.2,1)',
                    }} />
                  </div>
                </Panel>
              </div>
            );
          }

          // ── Value / Setpoint Control ──────────────────────────────────────
          if (nodeData.category === 'value_control') {
            const step = nodeData.step ?? 1;
            const minV = nodeData.min  ?? -Infinity;
            const maxV = nodeData.max  ??  Infinity;

            const btnBase = {
              width: 28, height: 28, borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)', cursor: 'pointer',
              backgroundColor: 'var(--bg-subtle)', color: 'var(--text-primary)',
              fontWeight: 700, fontSize: 17, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'auto', flexShrink: 0,
            };

            return (
              <div key={nodeData.id} style={baseStyle}>
                <Panel style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '6px 10px' }} showBorder={showBorder} bgColor={bgColor}>
                  {showLabel && <CardLabel>{name}</CardLabel>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button style={btnBase}
                      onClick={e => { e.stopPropagation(); if (boundedKey) writeTag(boundedKey, Math.max(minV, Number(rawVal) - step)); }}>
                      −
                    </button>
                    <div style={{
                      minWidth: 56, padding: '3px 8px', textAlign: 'center',
                      fontFamily: 'JetBrains Mono, Geist Mono, monospace',
                      fontWeight: 700, fontSize: 15, color: 'var(--text-primary)',
                      backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      {Number(rawVal).toFixed(decimals)}
                      {unit && <span style={{ fontSize: 9, fontWeight: 400, marginLeft: 2, opacity: 0.7 }}>{unit}</span>}
                    </div>
                    <button style={btnBase}
                      onClick={e => { e.stopPropagation(); if (boundedKey) writeTag(boundedKey, Math.min(maxV, Number(rawVal) + step)); }}>
                      +
                    </button>
                  </div>
                </Panel>
              </div>
            );
          }

          // ── Status LED ────────────────────────────────────────────────────
          if (nodeData.category === 'status_led') {
            const lit = !!val;
            return (
              <div key={nodeData.id} style={baseStyle}>
                <Panel style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px' }} showBorder={showBorder} bgColor={bgColor}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    backgroundColor: lit ? color : 'var(--bg-subtle)',
                    border: `2px solid ${lit ? color : 'var(--border)'}`,
                    boxShadow: lit ? `0 0 14px ${color}55` : 'none',
                    transition: 'all 0.3s', position: 'relative', overflow: 'hidden',
                  }}>
                    {lit && (
                      <div style={{ position: 'absolute', top: '12%', left: '18%', width: '40%', height: '30%', borderRadius: '50%', background: 'rgba(255,255,255,0.5)', transform: 'rotate(-35deg)' }} />
                    )}
                  </div>
                  {showLabel && <CardLabel>{name}</CardLabel>}
                </Panel>
              </div>
            );
          }

          // ── Battery Level ─────────────────────────────────────────────────
          if (nodeData.category === 'battery_level') {
            const level  = Math.max(0, Math.min(100, Number(val) || 0));
            const sc     = statusColor(level, 20, 50);
            const fillPx = (level / 100) * 42;

            return (
              <div key={nodeData.id} style={baseStyle}>
                <Panel style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 10px' }} showBorder={showBorder} bgColor={bgColor}>
                  {showLabel && <CardLabel>{name}</CardLabel>}
                  <svg viewBox="0 0 72 34" style={{ width: '88%', height: 'auto' }}>
                    <rect x="1" y="4" width="58" height="26" rx="3" stroke="var(--border)" strokeWidth="1.5" fill="var(--bg-subtle)" />
                    <rect x="59" y="11" width="9" height="12" rx="2" fill="var(--border)" />
                    {fillPx > 0 && (
                      <rect x="3" y="6" width={fillPx} height="22" rx="2" fill={sc} opacity="0.6" />
                    )}
                    {[16, 30, 43].filter(x => x < 2 + fillPx).map(x => (
                      <line key={x} x1={x} y1="6" x2={x} y2="28" stroke="var(--bg-panel)" strokeWidth="1" opacity="0.4" />
                    ))}
                    <text x="30" y="21" textAnchor="middle" fontSize="9" fill={sc} fontFamily="JetBrains Mono, Geist Mono, monospace" fontWeight="700">
                      {level.toFixed(0)}%
                    </text>
                  </svg>
                </Panel>
              </div>
            );
          }

          // ── Alert Banner ──────────────────────────────────────────────────
          if (nodeData.category === 'alert_banner') {
            const active = !!val;
            const ac     = active ? 'var(--status-error)' : 'var(--status-ok)';
            const msg    = nodeData.alertMsg || (active ? 'HAZARD DETECTED' : 'SYSTEM SAFE');

            return (
              <div key={nodeData.id} style={{
                ...baseStyle,
                backgroundColor: bgColor || 'var(--bg-panel)',
                border: `1px solid ${active ? 'var(--status-error)' : 'var(--border)'}`,
                borderLeft: `3px solid ${ac}`,
                borderRadius: 'var(--radius-md)',
                boxShadow: active ? '0 0 18px rgba(239,68,68,0.2)' : 'var(--shadow-sm)',
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', transition: 'all 0.3s',
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, backgroundColor: ac, animation: active ? 'live-pulse 1s infinite' : 'none', boxShadow: active ? '0 0 8px var(--status-error)' : 'none' }} />
                <div style={{ minWidth: 0 }}>
                  {showLabel && <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{name}</div>}
                  <div style={{ fontSize: 12, fontWeight: 700, color: ac, fontFamily: 'monospace', marginTop: 1 }}>
                    {msg}
                  </div>
                </div>
              </div>
            );
          }

          // ── Header Text ───────────────────────────────────────────────────
          if (nodeData.category === 'header_text') {
            return (
              <div key={nodeData.id} style={{ ...baseStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.01em', color: 'var(--text-primary)', userSelect: 'none' }}>
                  {name}
                </span>
              </div>
            );
          }

          // ── Charts ────────────────────────────────────────────────────────
          if (nodeData.category === 'line_chart' || nodeData.category === 'bar_chart') {
            return (
              <div key={nodeData.id} style={baseStyle}>
                <Panel style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '4px 2px 2px' }} showBorder={showBorder} bgColor={bgColor}>
                  {showLabel && <CardLabel>{name || 'Chart'}</CardLabel>}
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {nodeData.category === 'line_chart' ? (
                        <LineChart data={history} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                          <XAxis dataKey="time" hide />
                          <YAxis stroke="var(--border)" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} domain={['auto', 'auto']} />
                          <Tooltip contentStyle={chartTooltipStyle} itemStyle={{ color }} />
                          <Line type="stepAfter" dataKey={boundedKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
                        </LineChart>
                      ) : (
                        <BarChart data={history} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
                          <XAxis dataKey="time" hide />
                          <YAxis stroke="var(--border)" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} domain={[0, 'auto']} />
                          <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'var(--bg-hover)' }} itemStyle={{ color }} />
                          <Bar dataKey={boundedKey} fill={color} isAnimationActive={false} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </Panel>
              </div>
            );
          }

          // ── Tag Node ──────────────────────────────────────────────────────
          if (nodeData.category === 'tagNode') {
            return (
              <div key={nodeData.id} style={{
                ...baseStyle,
                backgroundColor: bgColor || 'var(--bg-panel)',
                border: showBorder ? '1px solid var(--border)' : 'none',
                borderLeft: '2px solid var(--accent)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 10px',
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                boxShadow: showBorder ? 'var(--shadow-sm)' : 'none',
              }}>
                <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, Geist Mono, monospace', color: 'var(--accent)', fontWeight: 700, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {boundedKey || 'NO TAG'}
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, Geist Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {rawVal !== undefined ? rawVal.toString() : '—'}
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>

      {selectedCellId && nodes.find(n => n.id === selectedCellId) && !isSimulating && (
        <ResizeOverlay graph={graph} node={nodes.find(n => n.id === selectedCellId)} paperRef={paperRef} />
      )}
    </div>
  );
};
