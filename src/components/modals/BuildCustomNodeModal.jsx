import React, { useState } from "react";
import { Wrench, X } from "lucide-react";
import { CustomDropdown } from "../ui/CustomDropdown";
import { CustomColorPicker } from "../ui/CustomColorPicker";

const BuildCustomNodeModal = ({ onClose, onCreate, isDarkMode }) => {
  const [nodeName, setNodeName] = useState("Custom Node");
  const [baseTemplate, setBaseTemplate] = useState("temp_display");
  const [nodeColor, setNodeColor] = useState("#3B82F6");
  const [nodeUnit, setNodeUnit] = useState("U");

  const templateOpts = [
    { value: "temp_display", label: "Numeric Display" },
    { value: "tank_level", label: "Liquid Tank" },
    { value: "gauge_dial", label: "Analog Gauge" },
    { value: "progress_bar", label: "Progress Bar" },
    { value: "status_led", label: "Status LED" },
    { value: "toggle_switch", label: "Toggle Switch" },
    { value: "alert_banner", label: "Alert Banner" },
    { value: "digital_readout", label: "LCD Display" },
    { value: "motor_status", label: "Motor/Fan" },
    { value: "line_chart", label: "Line Chart" },
    { value: "bar_chart", label: "Bar Chart" },
  ];

  const inputSt = {
    backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', borderRadius: 8, padding: '8px 12px',
    fontSize: 12, outline: 'none', width: '100%',
  };

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="w-96 rounded-2xl shadow-2xl theme-transition" style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border)' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Wrench size={16} style={{ color: 'var(--accent)' }} />
            <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Build Custom Node</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg transition-colors"
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          ><X size={16} style={{ color: 'var(--text-secondary)' }} /></button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Node Name</label>
            <input style={inputSt} value={nodeName} onChange={e => setNodeName(e.target.value)} placeholder="e.g. Pressure Sensor" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Base Template</label>
            <CustomDropdown value={baseTemplate} options={templateOpts} onChange={setBaseTemplate} placeholder="Select template..." />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Unit Symbol</label>
            <input style={inputSt} value={nodeUnit} onChange={e => setNodeUnit(e.target.value)} placeholder="e.g. °C, %, PSI" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Theme Color</label>
            <CustomColorPicker value={nodeColor} onChange={setNodeColor} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase transition-colors"
            style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Cancel</button>
          <button
            onClick={() => { onCreate({ name: nodeName, template: baseTemplate, color: nodeColor, unit: nodeUnit }); onClose(); }}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase transition-colors"
            style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF', border: 'none' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--accent)'}
          >Create Node</button>
        </div>
      </div>
    </div>
  );
};

export default BuildCustomNodeModal;
