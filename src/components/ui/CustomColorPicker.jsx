import React from "react";

export const CustomColorPicker = ({ value, onChange }) => {
  const PRESET_COLORS = [
    "#3B82F6", "#06B6D4", "#10B981", "#22C55E",
    "#F59E0B", "#EF4444", "#8B5CF6", "#9CA3AF"
  ];
  return (
    <div className="flex flex-col gap-2 p-2 rounded-lg shadow-inner theme-transition"
      style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md shadow-sm border" style={{ backgroundColor: value, borderColor: 'var(--border)' }}></div>
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-xs font-mono uppercase"
          style={{ color: 'var(--text-secondary)' }}
        />
      </div>
      <div className="grid grid-cols-4 gap-1.5 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        {PRESET_COLORS.map(c => (
          <div
            key={c}
            onClick={() => onChange(c)}
            className={`w-full h-5 rounded cursor-pointer transition-transform hover:scale-110 ${value === c ? 'ring-2 ring-offset-1' : ''}`}
            style={{
              backgroundColor: c,
              '--tw-ring-color': c,
              '--tw-ring-offset-color': 'var(--bg-input)',
            }}
          />
        ))}
      </div>
    </div>
  );
};
