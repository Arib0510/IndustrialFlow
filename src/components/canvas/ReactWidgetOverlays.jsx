import React, { useContext, useRef, useEffect } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle } from "lucide-react";
import { SCADAContext } from "../../context/SCADAContext";
import { ResizeOverlay } from "./ResizeOverlay";
import { GaugeWidget } from "./GaugeWidget";

// ─── Industrial Hardware UI Components ─────────────────────────────────────

const Screw = ({ style }) => (
  <div style={{
    width: 6, height: 6, borderRadius: '50%',
    background: 'linear-gradient(135deg, #e2e8f0, #64748b)',
    border: '1px solid #334155',
    boxShadow: 'inset 1px 1px 2px #fff, 1px 1px 2px rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'absolute', ...style
  }}>
    <div style={{ width: '80%', height: 1, background: '#334155', transform: 'rotate(45deg)' }} />
  </div>
);

const HardwarePanel = ({ isDarkMode, children, style, className = '' }) => {
  const bg = isDarkMode 
    ? 'linear-gradient(135deg, #334155 0%, #0f172a 100%)' 
    : 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)'; 
  const borderTop = isDarkMode ? '#475569' : '#ffffff';
  const borderBottom = isDarkMode ? '#020617' : '#94a3b8';
  
  return (
    <div className={className} style={{
      ...style,
      background: bg,
      borderTop: `2px solid ${borderTop}`,
      borderLeft: `2px solid ${borderTop}`,
      borderBottom: `2px solid ${borderBottom}`,
      borderRight: `2px solid ${borderBottom}`,
      borderRadius: '2px',
      boxShadow: '4px 4px 10px rgba(0,0,0,0.4)',
      // NOTE: Do NOT override position here — the spread ...style already sets
      // position: 'absolute' with left/top from JointJS model coords.
      // Setting position: 'relative' here would break alignment for all widgets.
    }}>
      <Screw style={{ top: 4, left: 4 }} />
      <Screw style={{ top: 4, right: 4 }} />
      <Screw style={{ bottom: 4, left: 4 }} />
      <Screw style={{ bottom: 4, right: 4 }} />
      {children}
    </div>
  );
};

const EngravedLabel = ({ isDarkMode, children, className = '' }) => (
  <div className={`text-[10px] font-bold uppercase tracking-widest truncate w-full text-center mb-2 px-2 ${className}`} 
       style={{ 
         color: isDarkMode ? '#94a3b8' : '#475569',
         textShadow: isDarkMode ? '1px 1px 1px #000' : '1px 1px 1px #fff'
       }}>
    {children}
  </div>
);

// ─── Main Overlays Engine ──────────────────────────────────────────────────
export const ReactWidgetOverlays = ({ graph, nodes, history, selectedCellId, paperRef }) => {
  const { tags, writeTag, isSimulating, isDarkMode } = useContext(SCADAContext);
  const transformRef = useRef(null);

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

  const tooltipStyle = { backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '10px', color: '#f8fafc' };

  return (
    <div className="absolute inset-0 z-[5] pointer-events-none">
      <div ref={transformRef} style={{ position: 'absolute', top: 0, left: 0, transformOrigin: '0 0' }}>
        {nodes.map(nodeData => {
        // Drawn shapes (rect/ellipse drawn by draw tool) are pure JointJS SVG – no HTML overlay needed
        if (nodeData.category === 'drawn_shape') return null;
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

        if (nodeData.category === 'line_chart' || nodeData.category === 'bar_chart') {
          return (
            <HardwarePanel isDarkMode={isDarkMode} key={nodeData.id} style={style} className="flex flex-col p-2">
              <EngravedLabel isDarkMode={isDarkMode}>{name || "Chart"}</EngravedLabel>
              <div className="flex-1 min-h-0 w-full overflow-hidden" style={{ background: '#020617', border: 'inset 2px #000', borderRadius: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  {nodeData.category === 'line_chart' ? (
                    <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="time" hide={true} />
                      <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={tooltipStyle} itemStyle={{ color }} />
                      <Line type="stepAfter" dataKey={boundedKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                  ) : (
                    <BarChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="time" hide={true} />
                      <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} domain={[0, 'auto']} />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.05)' }} itemStyle={{ color }} />
                      <Bar dataKey={boundedKey} fill={color} isAnimationActive={false} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </HardwarePanel>
          );
        }

        if (nodeData.category === 'gauge_dial') {
          return (
            <div key={nodeData.id} style={{ ...style, pointerEvents: 'auto' }}>
              <HardwarePanel isDarkMode={isDarkMode} style={{ width: '100%', height: '100%', borderRadius: '50%' }}>
                <GaugeWidget node={nodeData} />
              </HardwarePanel>
            </div>
          );
        }

        if (['tank_level', 'motor_status', 'valve_control'].includes(nodeData.category)) {
          let text = "";
          let bg = isDarkMode ? '#1e293b' : '#f8fafc';
          let textColor = isDarkMode ? '#f8fafc' : '#0f172a';
          
          if (nodeData.category === 'tank_level') text = `${Number(Math.max(0, Math.min(100, val || 0))).toFixed(1)} ${unit || '%'}`;
          else if (nodeData.category === 'motor_status') { text = val ? "RUNNING" : "STOPPED"; textColor = val ? '#22C55E' : '#EF4444'; }
          else if (nodeData.category === 'valve_control') { text = val ? "OPEN" : "CLOSED"; textColor = val ? '#22C55E' : '#EF4444'; }

          return (
            <div key={nodeData.id} style={style} className="flex flex-col items-center justify-center pointer-events-none">
              <div className="relative px-3 py-1 mt-6 shadow-lg" style={{ background: bg, border: '1px solid #475569', borderRadius: 2 }}>
                <Screw style={{ top: 2, left: 2, width: 4, height: 4 }} />
                <Screw style={{ top: 2, right: 2, width: 4, height: 4 }} />
                <Screw style={{ bottom: 2, left: 2, width: 4, height: 4 }} />
                <Screw style={{ bottom: 2, right: 2, width: 4, height: 4 }} />
                <div className="text-[10px] font-mono font-bold" style={{ color: textColor, textShadow: '0 0 2px rgba(0,0,0,0.5)' }}>{text}</div>
              </div>
            </div>
          );
        }

        if (nodeData.category === 'progress_bar') {
          const pcent = Math.max(0, Math.min(100, val || 0));
          const segments = 12;
          const activeSegments = Math.round((pcent / 100) * segments);
          
          return (
            <HardwarePanel isDarkMode={isDarkMode} key={nodeData.id} style={style} className="flex flex-col justify-center p-3">
              <EngravedLabel isDarkMode={isDarkMode} className="text-left">{name}</EngravedLabel>
              <div className="w-full h-6 flex gap-1 p-1" style={{ background: '#020617', border: 'inset 2px #000', borderRadius: 2 }}>
                {Array.from({ length: segments }).map((_, i) => (
                  <div key={i} className="flex-1 h-full transition-all duration-300" style={{ 
                    background: i < activeSegments ? color : '#1e293b',
                    boxShadow: i < activeSegments ? `0 0 8px ${color}` : 'none',
                    opacity: i < activeSegments ? 1 : 0.3,
                    borderRadius: 1
                  }} />
                ))}
              </div>
              <div className="text-[12px] font-mono font-bold mt-2 text-right" style={{ color: color, textShadow: `0 0 5px ${color}` }}>
                {Number(val).toFixed(1)} {unit}
              </div>
            </HardwarePanel>
          );
        }

        if (nodeData.category === 'digital_readout') {
          return (
            <HardwarePanel isDarkMode={isDarkMode} key={nodeData.id} style={style} className="flex flex-col justify-center p-2 text-center">
              <EngravedLabel isDarkMode={isDarkMode}>{name}</EngravedLabel>
              <div className="mx-2 p-1" style={{ background: '#022c22', border: 'inset 3px #000', borderRadius: 2 }}>
                <div className="text-[24px] font-mono font-bold leading-none" style={{ color, textShadow: `0px 0px 8px ${color}` }}>
                  {Number(val).toFixed(1)} <span className="text-[10px]">{unit}</span>
                </div>
              </div>
            </HardwarePanel>
          );
        }

        if (nodeData.category === 'temp_display') {
          return (
            <HardwarePanel isDarkMode={isDarkMode} key={nodeData.id} style={style} className="flex flex-col justify-center p-2 text-center">
              <EngravedLabel isDarkMode={isDarkMode}>{name}</EngravedLabel>
              <div className="text-[24px] font-sans font-black leading-none drop-shadow-md" style={{ color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                {typeof val === 'string' ? val : Number(val).toFixed(1)} <span className="text-sm">{unit}</span>
              </div>
            </HardwarePanel>
          );
        }

        if (nodeData.category === 'toggle_switch') {
          const isON = !!val;
          return (
            <HardwarePanel isDarkMode={isDarkMode} key={nodeData.id} style={style} className="flex items-center p-3 gap-2">
              <div className="flex-1 flex flex-col items-center">
                <EngravedLabel isDarkMode={isDarkMode} className="mb-0">{name}</EngravedLabel>
                <div className="text-[10px] font-bold" style={{ color: isON ? '#22C55E' : '#EF4444' }}>{isON ? "ON" : "OFF"}</div>
              </div>
              <div 
                onClick={(e) => { e.stopPropagation(); if (boundedKey) writeTag(boundedKey, !isON); }}
                style={{ 
                  pointerEvents: 'auto', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer',
                  background: 'radial-gradient(circle at 30% 30%, #64748b, #0f172a)', 
                  border: '2px solid #334155', boxShadow: '0 4px 6px rgba(0,0,0,0.8), inset 0 2px 4px rgba(255,255,255,0.3)',
                  transform: isON ? 'rotate(45deg)' : 'rotate(-45deg)', transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
                className="relative shrink-0"
              >
                <div style={{ position: 'absolute', top: 2, left: '50%', marginLeft: -3, width: 6, height: 14, background: isON ? '#22C55E' : '#EF4444', borderRadius: '3px', boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.8)' }} />
              </div>
            </HardwarePanel>
          );
        }

        if (nodeData.category === 'value_control') {
          const btnStyle = {
             width: 28, height: 28, borderRadius: '50%', pointerEvents: 'auto', cursor: 'pointer',
             background: 'linear-gradient(135deg, #ef4444, #991b1b)', border: '2px solid #7f1d1d',
             boxShadow: '0 3px 5px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.4)',
             color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center'
          };
          return (
            <HardwarePanel isDarkMode={isDarkMode} key={nodeData.id} style={style} className="flex flex-col items-center justify-center p-2">
              <EngravedLabel isDarkMode={isDarkMode}>{name}</EngravedLabel>
              <div className="flex items-center gap-2">
                <button style={btnStyle} onClick={(e) => { e.stopPropagation(); if (boundedKey) writeTag(boundedKey, Number(val) - 1); }}>-</button>
                <div className="w-12 py-1 text-center font-mono font-bold text-[14px]" style={{ background: '#020617', border: 'inset 2px #000', color: '#3B82F6', textShadow: '0 0 5px #3b82f6' }}>
                  {Number(val).toFixed(0)}
                </div>
                <button style={{...btnStyle, background: 'linear-gradient(135deg, #22c55e, #166534)', border: '2px solid #14532d'}} onClick={(e) => { e.stopPropagation(); if (boundedKey) writeTag(boundedKey, Number(val) + 1); }}>+</button>
              </div>
            </HardwarePanel>
          );
        }

        if (nodeData.category === 'status_led') {
          return (
            <HardwarePanel isDarkMode={isDarkMode} key={nodeData.id} style={style} className="flex flex-col items-center justify-center p-2">
              <EngravedLabel isDarkMode={isDarkMode}>{name}</EngravedLabel>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', border: '3px solid #334155', position: 'relative',
                background: val ? `radial-gradient(circle at 30% 30%, #fff, ${color} 40%, #000)` : 'radial-gradient(circle at 30% 30%, #64748b, #0f172a)',
                boxShadow: val ? `0 0 20px ${color}, inset 0 -4px 8px rgba(0,0,0,0.6)` : 'inset 0 -4px 8px rgba(0,0,0,0.6)',
              }}>
                <div style={{ position: 'absolute', top: '10%', left: '15%', width: '45%', height: '35%', background: 'linear-gradient(rgba(255,255,255,0.8), rgba(255,255,255,0))', borderRadius: '50%', transform: 'rotate(-45deg)' }} />
              </div>
            </HardwarePanel>
          );
        }

        if (nodeData.category === 'alert_banner') {
          return (
            <div key={nodeData.id} style={{ 
              ...style, 
              background: val ? 'repeating-linear-gradient(45deg, #fbbf24, #fbbf24 15px, #000 15px, #000 30px)' : '#1e293b',
              border: val ? '4px solid #ef4444' : '4px solid #334155', 
              boxShadow: val ? '0 0 20px rgba(239, 68, 68, 0.8)' : 'none',
              borderRadius: 4
            }} className="flex items-center p-2 gap-3 transition-all theme-transition">
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: val ? 'radial-gradient(circle, #ffaaaa, #ef4444)' : '#475569', boxShadow: val ? '0 0 15px #ef4444' : 'none' }} className={val ? "animate-pulse shrink-0" : "shrink-0"} />
              <div className="flex flex-col bg-black/60 px-2 py-1 rounded backdrop-blur-sm">
                <div className="text-[10px] font-bold text-white uppercase tracking-widest">{name}</div>
                <div className="text-[14px] font-black" style={{ color: val ? '#ef4444' : '#22C55E' }}>{val ? "HAZARD DETECTED" : "SYSTEM SAFE"}</div>
              </div>
            </div>
          );
        }

        if (nodeData.category === 'header_text') {
          return (
            <div key={nodeData.id} style={style} className="flex items-center justify-center">
              <span className="text-[28px] font-sans font-black uppercase tracking-widest" 
                    style={{ color: isDarkMode ? '#1e293b' : '#cbd5e1', textShadow: isDarkMode ? '1px 1px 2px rgba(255,255,255,0.1), -1px -1px 2px rgba(0,0,0,0.8)' : '1px 1px 2px #fff, -1px -1px 2px rgba(0,0,0,0.2)' }}>
                {name}
              </span>
            </div>
          );
        }

        if (nodeData.category === 'tagNode') {
          return (
            <HardwarePanel isDarkMode={isDarkMode} key={nodeData.id} style={style} className="flex flex-col justify-center p-2 border-l-4 border-l-amber-500">
              <div className="text-[10px] font-bold font-mono truncate mb-1" style={{ color: '#F59E0B' }}>{boundedKey || 'NO TAG'}</div>
              <div className="text-[16px] font-sans font-black truncate" style={{ color: isDarkMode ? '#f8fafc' : '#0f172a' }}>{val !== undefined ? val.toString() : '---'}</div>
            </HardwarePanel>
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