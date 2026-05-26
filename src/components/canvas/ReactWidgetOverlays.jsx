import React, { useContext, useRef, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { SCADAContext } from "../../context/SCADAContext";
import { SelectionOverlay } from './SelectionOverlay';
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
                    <rect x="5" y="5" width="50" height="80" rx="6" fill="transparent" stroke="var(--border)" strokeWidth="1.5" />
                    <rect x="10" y={fillY} width="40" height={fillH} rx="2" fill={sc} opacity="0.8" />
                    <text x="30" y="48" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text-primary)" fontFamily="monospace">
                      {level.toFixed(1)}%
                    </text>
                  </svg>
                </Panel>
              </div>
            );
          }

          // ── Motor / Pump ──────────────────────────────────────────────────
          if (nodeData.category === 'motor_status') {
            const isActive = Boolean(val);
            const sc       = isActive ? 'var(--status-ok)' : 'var(--status-error)';
            return (
              <div key={nodeData.id} style={baseStyle}>
                <Panel style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }} showBorder={showBorder} bgColor={bgColor}>
                  {showLabel && <CardLabel>{name}</CardLabel>}
                  <div style={{ position: 'relative', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${sc}`, opacity: 0.3 }} />
                    <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: sc, opacity: isActive ? 0.8 : 0.2, filter: isActive ? 'blur(4px)' : 'none' }} />
                    <div style={{ position: 'absolute', fontSize: 10, fontWeight: 800, color: isActive ? '#fff' : 'var(--text-muted)' }}>
                      {isActive ? 'ON' : 'OFF'}
                    </div>
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>{isActive ? 'RUNNING' : 'STOPPED'}</div>
                </Panel>
              </div>
            );
          }

          // ── Gauge / Dial ──────────────────────────────────────────────────
          if (nodeData.category === 'gauge_dial') {
            return (
              <div key={nodeData.id} style={baseStyle}>
                <Panel style={{ width: '100%', height: '100%', padding: '4px 8px 8px' }} showBorder={showBorder} bgColor={bgColor}>
                  {showLabel && <CardLabel>{name}</CardLabel>}
                  <div style={{ flex: 1, position: 'relative' }}>
                    <GaugeWidget node={nodeData} />
                  </div>
                </Panel>
              </div>
            );
          }

          // ── Progress Bar ──────────────────────────────────────────────────
          if (nodeData.category === 'progress_bar') {
            const pct = Math.max(0, Math.min(100, Number(val) || 0));
            return (
              <div key={nodeData.id} style={baseStyle}>
                <Panel style={{ width: '100%', height: '100%', padding: '6px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }} showBorder={showBorder} bgColor={bgColor}>
                  <div className="flex justify-between items-end">
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-primary)' }}>{name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' }}>{pct.toFixed(1)}{unit}</span>
                  </div>
                  <div style={{ height: 10, backgroundColor: 'var(--bg-subtle)', borderRadius: 5, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)' }} />
                  </div>
                </Panel>
              </div>
            );
          }

          // ── Valve Control ─────────────────────────────────────────────────
          if (nodeData.category === 'valve_control') {
            const isOpen = Boolean(val);
            return (
              <div key={nodeData.id} style={baseStyle}>
                <Panel style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }} showBorder={showBorder} bgColor={bgColor}>
                  {showLabel && <CardLabel>{name}</CardLabel>}
                  <button
                    onClick={() => writeTag(boundedKey, !isOpen)}
                    className="group"
                    style={{
                      width: 44, height: 24, borderRadius: 12, position: 'relative',
                      backgroundColor: isOpen ? 'var(--status-ok)' : 'var(--bg-subtle)',
                      border: '1px solid var(--border)', cursor: isSimulating ? 'pointer' : 'default',
                      transition: 'background-color 0.2s', pointerEvents: 'auto'
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 3, left: isOpen ? 23 : 3,
                      width: 16, height: 16, borderRadius: '50%', backgroundColor: '#fff',
                      boxShadow: 'var(--shadow-sm)', transition: 'left 0.2s cubic-bezier(0.4,0,0.2,1)'
                    }} />
                  </button>
                  <span style={{ fontSize: 9, fontWeight: 700, color: isOpen ? 'var(--status-ok)' : 'var(--text-muted)' }}>
                    {isOpen ? 'OPEN' : 'CLOSED'}
                  </span>
                </Panel>
              </div>
            );
          }

          // ── Digital Readout / LCD ─────────────────────────────────────────
          if (nodeData.category === 'digital_readout') {
            return (
              <div key={nodeData.id} style={baseStyle}>
                <Panel style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: 4 }} showBorder={showBorder} bgColor={bgColor}>
                  {showLabel && <CardLabel>{name}</CardLabel>}
                  <div style={{
                    flex: 1, backgroundColor: '#111', borderRadius: 4, margin: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid #333', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)'
                  }}>
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700,
                      color: color, textShadow: `0 0 8px ${color}66`
                    }}>
                      {typeof val === 'number' ? val.toFixed(decimals) : String(val)}
                      <span style={{ fontSize: 10, marginLeft: 2, opacity: 0.7 }}>{unit}</span>
                    </span>
                  </div>
                </Panel>
              </div>
            );
          }

          // ── Alert Banner ──────────────────────────────────────────────────
          if (nodeData.category === 'alert_banner') {
            const isAlert = Boolean(val);
            if (!isAlert && isSimulating) return null;
            return (
              <div key={nodeData.id} style={baseStyle}>
                <div style={{
                  width: '100%', height: '100%', borderRadius: 'var(--radius-md)',
                  backgroundColor: isAlert ? 'rgba(239,68,68,0.15)' : 'rgba(100,116,139,0.1)',
                  border: `1.5px solid ${isAlert ? '#EF4444' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px',
                  animation: isAlert ? 'pulse 2s infinite' : 'none'
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: isAlert ? '#EF4444' : '#64748B' }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: isAlert ? '#EF4444' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {isAlert ? (nodeData.alertText || 'CRITICAL ALARM') : 'SYSTEM NORMAL'}
                  </span>
                </div>
              </div>
            );
          }

          // ── Line Chart ────────────────────────────────────────────────────
          if (nodeData.category === 'line_chart') {
            const history = tags[boundedKey]?.history || [];
            return (
              <div key={nodeData.id} style={baseStyle}>
                <Panel style={{ width: '100%', height: '100%', padding: '6px 8px 8px' }} showBorder={showBorder} bgColor={bgColor}>
                  {showLabel && <CardLabel>{name}</CardLabel>}
                  <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {history.length < 2 ? (
                        <div className="h-full flex items-center justify-center text-[10px] text-muted italic">Waiting for data...</div>
                      ) : (
                        <LineChart data={history}>
                          <XAxis dataKey="t" hide />
                          <YAxis hide domain={['auto', 'auto']} />
                          <Tooltip contentStyle={chartTooltipStyle} cursor={{ stroke: 'var(--accent)', strokeWidth: 1 }} itemStyle={{ color }} />
                          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </Panel>
              </div>
            );
          }

          // ── Bar Chart ─────────────────────────────────────────────────────
          if (nodeData.category === 'bar_chart') {
            const history = tags[boundedKey]?.history || [];
            return (
              <div key={nodeData.id} style={baseStyle}>
                <Panel style={{ width: '100%', height: '100%', padding: '6px 8px 8px' }} showBorder={showBorder} bgColor={bgColor}>
                  {showLabel && <CardLabel>{name}</CardLabel>}
                  <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      {history.length < 2 ? (
                        <div className="h-full flex items-center justify-center text-[10px] text-muted italic">Waiting for data...</div>
                      ) : (
                        <BarChart data={history.slice(-10)}>
                          <XAxis dataKey="t" hide />
                          <YAxis hide domain={[0, 'auto']} />
                          <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'var(--bg-hover)' }} itemStyle={{ color }} />
                          <Bar dataKey="v" fill={color} isAnimationActive={false} />
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
