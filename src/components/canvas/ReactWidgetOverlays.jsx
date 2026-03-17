import React, { useContext, useRef, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle, Fan } from "lucide-react";
import { SCADAContext } from "../../context/SCADAContext";
import { ResizeOverlay } from "./ResizeOverlay";

// ─── Shared widget card wrapper ───────────────────────────────────────────────
const WidgetCard = ({ style, children, className = '', extraStyle = {} }) => (
  <div
    className={`theme-transition ${className}`}
    style={{
      ...style,
      backgroundColor: 'var(--bg-panel)',
      border: '2px solid var(--border)',
      borderRadius: '8px',
      ...extraStyle,
    }}
  >
    {children}
  </div>
);

const Label = ({ children, className = '' }) => (
  <div className={`text-[11px] font-bold truncate w-full text-center mb-1 ${className}`} style={{ color: 'var(--text-secondary)' }}>
    {children}
  </div>
);

const ValueDisplay = ({ children }) => (
  <div className="text-[14px] font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{children}</div>
);

export const ReactWidgetOverlays = ({ graph, nodes, history, selectedCellId, paperRef }) => {
  const { tags, writeTag, isSimulating, isDarkMode } = useContext(SCADAContext);
  const transformRef = useRef(null);

  // Sync overlay transform with JointJS paper scale/translate
  useEffect(() => {
    let animId;
    const syncTransform = () => {
      if (paperRef?.current && transformRef.current) {
        const { sx, sy } = paperRef.current.scale();
        const { tx, ty } = paperRef.current.translate();
        transformRef.current.style.transform = `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`;
      }
      animId = requestAnimationFrame(syncTransform);
    };
    syncTransform();
    return () => cancelAnimationFrame(animId);
  }, [paperRef]);

  // Theme-aware tooltip style for charts
  const tooltipStyle = {
    backgroundColor: 'var(--tooltip-bg)',
    borderColor: 'var(--tooltip-border)',
    fontSize: '10px',
    color: 'var(--tooltip-text)',
  };

  return (
    <div className="absolute inset-0 z-5 pointer-events-none">
      {/* Transform wrapper – stays in sync with JointJS paper zoom/pan */}
      <div
        ref={transformRef}
        style={{ position: 'absolute', top: 0, left: 0, transformOrigin: '0 0' }}
      >
        {nodes.map(nodeData => {
        let val = 0;
        const boundedKey = nodeData.boundTag || nodeData.tagKey;
        if (boundedKey && tags[boundedKey] !== undefined) val = tags[boundedKey].value;

        const pos = nodeData.position || { x: 0, y: 0 };
        const size = nodeData.size || { width: 120, height: 80 };
        const angle = nodeData.angle || 0;
        const color = nodeData.color || '#3B82F6';
        const name = nodeData.name || '';
        const unit = nodeData.unit || '';

        const style = {
          position: 'absolute', left: pos.x, top: pos.y, width: size.width, height: size.height,
          transform: `rotate(${angle}deg)`, pointerEvents: 'none'
        };

        // ── Line / Bar Chart ────────────────────────────────────────────────
        if (nodeData.category === 'line_chart' || nodeData.category === 'bar_chart') {
          return (
            <div key={nodeData.id} style={{ ...style, backgroundColor: 'var(--bg-main)', borderRadius: 6, border: '1px solid var(--border)' }}
              className="flex flex-col p-2 shadow-inner theme-transition">
              <div className="text-[10px] font-bold uppercase tracking-widest pl-2 mb-1 truncate" style={{ color: 'var(--text-secondary)' }}>{name || "Chart"}</div>
              <div className="flex-1 min-h-0 w-full overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  {nodeData.category === 'line_chart' ? (
                    <LineChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="time" hide={true} />
                      <YAxis stroke="var(--border)" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={tooltipStyle} itemStyle={{ color }} />
                      <Line type="monotone" dataKey={boundedKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  ) : (
                    <BarChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="time" hide={true} />
                      <YAxis stroke="var(--border)" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} domain={[0, 'auto']} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(128,128,128,0.1)' }} itemStyle={{ color }} />
                      <Bar dataKey={boundedKey} fill={color} isAnimationActive={false} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          );
        }

        // ── Tank Level ──────────────────────────────────────────────────────
        if (nodeData.category === 'tank_level') {
          const pcent = Math.max(0, Math.min(100, val || 0));
          return (
            <WidgetCard key={nodeData.id} style={style}
              className="flex flex-col items-center justify-between p-2">
              <Label>{name}</Label>
              <div className="flex-1 w-1/2 min-w-[40px] border-2 mx-auto my-2 rounded relative overflow-hidden theme-transition"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-canvas)' }}>
                <div className="absolute bottom-0 left-0 right-0 transition-all duration-300" style={{ height: `${pcent}%`, backgroundColor: color }}></div>
              </div>
              <ValueDisplay>{Number(pcent).toFixed(1)} {unit || '%'}</ValueDisplay>
            </WidgetCard>
          );
        }

        // ── Battery Level ───────────────────────────────────────────────────
        if (nodeData.category === 'battery_level') {
          const pcent = Math.max(0, Math.min(100, val || 0));
          const fcolor = pcent > 20 ? (pcent > 50 ? "#22C55E" : "#F59E0B") : "#EF4444";
          return (
            <WidgetCard key={nodeData.id} style={style} className="flex flex-col items-center justify-center p-3">
              <Label>{name}</Label>
              <div className="w-full h-8 border-2 rounded-md relative p-1 theme-transition"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-canvas)' }}>
                <div className="h-full rounded-sm transition-all duration-300" style={{ width: `${pcent}%`, backgroundColor: fcolor }}></div>
                <div className="absolute top-1/2 -translate-y-1/2 -right-2 w-2 h-4 rounded-r-sm" style={{ backgroundColor: 'var(--border-strong)' }}></div>
              </div>
              <div className="text-[16px] font-mono font-bold mt-2" style={{ color: 'var(--text-primary)' }}>{Number(pcent).toFixed(0)} %</div>
            </WidgetCard>
          );
        }

        // ── Gauge Dial ──────────────────────────────────────────────────────
        if (nodeData.category === 'gauge_dial') {
          const pcent = Math.max(0, Math.min(100, val || 0));
          const rot = (pcent / 100) * 270 - 135;
          return (
            <WidgetCard key={nodeData.id} style={style} className="relative flex flex-col items-center p-2">
              <div className="text-[10px] font-bold uppercase tracking-widest w-full text-center mb-1" style={{ color: 'var(--text-secondary)' }}>{name}</div>
              <div className="relative flex-1 w-full flex items-center justify-center min-h-0">
                <div className="absolute w-[80%] h-[80%] rounded-full border-[6px] border-b-transparent rotate-45" style={{ borderColor: 'var(--border)' }}></div>
                <div className="absolute w-[2px] h-[40%] origin-bottom shadow-lg transition-transform duration-300" style={{ backgroundColor: '#EF4444', transform: `translateY(-50%) rotate(${rot}deg)` }}></div>
                <div className="absolute w-2.5 h-2.5 rounded-full shadow-lg" style={{ backgroundColor: 'var(--border-strong)' }}></div>
              </div>
              <div className="text-[12px] font-mono font-bold mt-1 shrink-0" style={{ color: 'var(--text-primary)' }}>{Number(val).toFixed(0)} {unit}</div>
            </WidgetCard>
          );
        }

        // ── Progress Bar ────────────────────────────────────────────────────
        if (nodeData.category === 'progress_bar') {
          const pcent = Math.max(0, Math.min(100, val || 0));
          return (
            <WidgetCard key={nodeData.id} style={style} className="flex flex-col justify-center p-3">
              <Label className="text-left mb-2">{name}</Label>
              <div className="w-full h-4 rounded-full relative overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
                <div className="h-full transition-all duration-300" style={{ width: `${pcent}%`, backgroundColor: color }}></div>
              </div>
              <div className="text-[14px] font-mono font-bold mt-2" style={{ color: 'var(--text-primary)' }}>{Number(val).toFixed(1)} {unit}</div>
            </WidgetCard>
          );
        }

        // ── Digital Readout (LCD) ───────────────────────────────────────────
        if (nodeData.category === 'digital_readout') {
          return (
            <div key={nodeData.id} style={{ ...style, backgroundColor: isDarkMode ? '#020617' : '#F0F4F8', borderRadius: 4, border: '2px solid var(--border)' }}
              className="text-center flex flex-col justify-center p-2 theme-transition">
              <div className="text-[10px] font-bold truncate mb-1" style={{ color: 'var(--text-secondary)' }}>{name}</div>
              <div className="text-[24px] font-mono font-bold leading-none" style={{ color }}>{Number(val).toFixed(1)} <span className="text-xs">{unit}</span></div>
            </div>
          );
        }

        // ── Temp / Numeric Display ──────────────────────────────────────────
        if (nodeData.category === 'temp_display') {
          return (
            <WidgetCard key={nodeData.id} style={style} className="text-center flex flex-col justify-center p-2">
              <div className="text-[12px] font-bold truncate mb-2" style={{ color: 'var(--text-secondary)' }}>{name}</div>
              <div className="text-[24px] font-sans font-bold leading-none" style={{ color }}>{typeof val === 'string' ? val : Number(val).toFixed(1)} <span className="text-sm">{unit}</span></div>
            </WidgetCard>
          );
        }

        // ── Toggle Switch ───────────────────────────────────────────────────
        if (nodeData.category === 'toggle_switch') {
          const isON = !!val;
          return (
            <WidgetCard key={nodeData.id} style={style} className="flex items-center p-3 gap-3">
              <div className={`text-[12px] font-bold flex-1 truncate`} style={{ color: isON ? '#22C55E' : 'var(--text-secondary)' }}>
                {isON ? "ON" : "OFF"}
              </div>
              <div
                onClick={(e) => { e.stopPropagation(); if (boundedKey) writeTag(boundedKey, !isON); }}
                style={{ pointerEvents: 'auto', backgroundColor: isON ? '#22C55E' : 'var(--bg-hover)' }}
                className="w-14 h-7 rounded-full flex items-center px-1 cursor-pointer transition-colors shadow-inner shrink-0"
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${isON ? 'translate-x-7' : ''}`}></div>
              </div>
            </WidgetCard>
          );
        }

        // ── Valve Control ───────────────────────────────────────────────────
        if (nodeData.category === 'valve_control') {
          const isOPEN = !!val;
          return (
            <WidgetCard key={nodeData.id} style={style} className="flex flex-col items-center justify-center p-2">
              <div className="text-[10px] font-bold truncate w-full text-center mb-1" style={{ color: 'var(--text-secondary)' }}>{name}</div>
              <div className="relative w-10 h-6 shrink-0 flex items-center justify-center cursor-pointer" style={{ pointerEvents: 'auto' }}
                onClick={(e) => { e.stopPropagation(); if (boundedKey) writeTag(boundedKey, !isOPEN); }}>
                <div className={`absolute border-t-transparent border-b-transparent border-t-12 border-b-12 border-r-16 left-0 transition-colors ${isOPEN ? 'border-r-[#22C55E]' : 'border-r-[#EF4444]'}`}></div>
                <div className={`absolute border-t-transparent border-b-transparent border-t-12 border-b-12 border-l-16 right-0 transition-colors ${isOPEN ? 'border-l-[#22C55E]' : 'border-l-[#EF4444]'}`}></div>
              </div>
              <div className={`text-[10px] font-bold mt-2`} style={{ color: isOPEN ? '#22C55E' : '#EF4444' }}>{isOPEN ? "OPEN" : "CLOSED"}</div>
            </WidgetCard>
          );
        }

        // ── Status LED ──────────────────────────────────────────────────────
        if (nodeData.category === 'status_led') {
          return (
            <WidgetCard key={nodeData.id} style={style} className="flex flex-col items-center justify-center p-2">
              <div className="text-[10px] font-bold truncate w-full text-center mb-2" style={{ color: 'var(--text-secondary)' }}>{name}</div>
              <div className="w-8 h-8 rounded-full border-2 transition-all duration-300"
                style={{ backgroundColor: val ? color : 'var(--bg-canvas)', borderColor: val ? color : 'var(--border)', boxShadow: val ? `0 0 15px ${color}` : 'none' }}>
              </div>
            </WidgetCard>
          );
        }

        // ── Motor Status ────────────────────────────────────────────────────
        if (nodeData.category === 'motor_status') {
          return (
            <WidgetCard key={nodeData.id} style={style} className="flex flex-col items-center justify-center p-2">
              <div className="text-[12px] font-bold truncate w-full text-center mb-2" style={{ color: 'var(--text-secondary)' }}>{name}</div>
              <div className="relative w-10 h-10 border-2 rounded-full flex items-center justify-center overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <Fan size={24} className={val ? "animate-spin" : ""} style={{ color: val ? color : 'var(--text-muted)' }} />
              </div>
              <div className="text-[10px] font-bold mt-2" style={{ color: val ? '#22C55E' : 'var(--text-secondary)' }}>{val ? "RUNNING" : "STOPPED"}</div>
            </WidgetCard>
          );
        }

        // ── Value Control ───────────────────────────────────────────────────
        if (nodeData.category === 'value_control') {
          return (
            <WidgetCard key={nodeData.id} style={style} className="flex flex-col items-center justify-center p-2">
              <div className="text-[12px] font-bold truncate w-full text-center mb-2" style={{ color: 'var(--text-secondary)' }}>{name}</div>
              <div className="flex items-center gap-3">
                <button className="w-8 h-8 rounded font-bold transition-colors" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', pointerEvents: 'auto' }}
                  onClick={(e) => { e.stopPropagation(); if (boundedKey) writeTag(boundedKey, Number(val) - 1); }}>-</button>
                <div className="text-[20px] font-mono font-bold w-12 text-center" style={{ color: 'var(--accent)' }}>{Number(val).toFixed(0)}</div>
                <button className="w-8 h-8 rounded font-bold transition-colors" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', pointerEvents: 'auto' }}
                  onClick={(e) => { e.stopPropagation(); if (boundedKey) writeTag(boundedKey, Number(val) + 1); }}>+</button>
              </div>
            </WidgetCard>
          );
        }

        // ── Alert Banner ────────────────────────────────────────────────────
        if (nodeData.category === 'alert_banner') {
          return (
            <div key={nodeData.id} style={{ ...style, backgroundColor: 'var(--bg-panel)', borderRadius: 8, border: `2px solid ${val ? '#EF4444' : 'var(--border)'}` }}
              className="flex items-center p-2 gap-3 transition-colors theme-transition">
              <AlertTriangle size={24} className={val ? "animate-bounce" : ""} style={{ color: val ? '#EF4444' : 'var(--text-secondary)' }} />
              <div className="flex flex-col">
                <div className="text-[10px] font-bold truncate" style={{ color: 'var(--text-secondary)' }}>{name}</div>
                <div className="text-[14px] font-bold" style={{ color: val ? '#EF4444' : '#22C55E' }}>{val ? "ALERT ACTIVE" : "SYSTEM NORMAL"}</div>
              </div>
            </div>
          );
        }

        // ── Header Text ─────────────────────────────────────────────────────
        if (nodeData.category === 'header_text') {
          return (
            <div key={nodeData.id} style={style} className="flex items-center">
              <span className="text-[24px] font-sans font-light whitespace-nowrap" style={{ color }}>{name}</span>
            </div>
          );
        }

        // ── Tag Node ────────────────────────────────────────────────────────
        if (nodeData.category === 'tagNode') {
          return (
            <div key={nodeData.id} style={{ ...style, backgroundColor: 'var(--bg-panel)', border: '2px solid var(--accent)', borderRadius: 8 }}
              className="flex flex-col justify-center p-2 theme-transition">
              <div className="text-[10px] font-bold font-mono truncate mb-1" style={{ color: 'var(--accent)' }}>{boundedKey || 'Undefined Data Tag'}</div>
              <div className="text-[16px] font-sans font-bold truncate" style={{ color: 'var(--text-primary)' }}>{val !== undefined ? val.toString() : 'N/A'}</div>
            </div>
          );
        }

        // ── Fallback ────────────────────────────────────────────────────────
        return (
          <div key={nodeData.id} style={{ ...style, backgroundColor: 'var(--bg-panel)', border: '2px solid var(--border)', borderRadius: 8 }}
            className="flex items-center justify-center p-2 theme-transition">
            <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{name || nodeData.category}</span>
          </div>
        );

      })}
      </div> {/* end transform wrapper */}
      {selectedCellId && nodes.find(n => n.id === selectedCellId) && !isSimulating && (
        <ResizeOverlay graph={graph} node={nodes.find(n => n.id === selectedCellId)} paperRef={paperRef} />
      )}
    </div>
  );
};
