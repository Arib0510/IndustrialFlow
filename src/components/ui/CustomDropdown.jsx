import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export const CustomDropdown = ({ value, options, onChange, placeholder = "Select..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const selectedOpt = options.find(o => o.value === value);
  
  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2.5 rounded-lg text-[11px] font-mono shadow-inner cursor-pointer flex justify-between items-center transition-colors theme-transition"
        style={{
          backgroundColor: 'var(--bg-input)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
        }}
      >
        <span className="truncate">{selectedOpt ? selectedOpt.label : placeholder}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: isOpen ? 'var(--accent)' : 'var(--text-secondary)' }} />
      </div>
      {isOpen && (
        <div
          className="absolute top-full left-0 w-full mt-1 rounded-lg shadow-2xl z-[9999] max-h-48 overflow-y-auto custom-scrollbar theme-transition"
          style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border)' }}
        >
          <div
            onClick={() => { onChange(""); setIsOpen(false); }}
            className="p-2.5 text-[11px] font-mono cursor-pointer transition-colors"
            style={{
              color: value === "" ? 'var(--accent)' : 'var(--text-secondary)',
              backgroundColor: value === "" ? 'rgba(37,99,235,0.1)' : 'transparent',
            }}
            onMouseEnter={e => value !== "" && (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={e => value !== "" && (e.currentTarget.style.backgroundColor = 'transparent')}
          >-- None --</div>
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className="p-2.5 text-[11px] font-mono cursor-pointer flex justify-between items-center transition-colors"
              style={{
                color: value === opt.value ? 'var(--accent)' : 'var(--text-secondary)',
                backgroundColor: value === opt.value ? 'rgba(37,99,235,0.1)' : 'transparent',
                borderLeft: value === opt.value ? '2px solid var(--accent)' : '2px solid transparent',
              }}
              onMouseEnter={e => value !== opt.value && (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
              onMouseLeave={e => value !== opt.value && (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span className="truncate">{opt.label}</span>
              {value === opt.value && <Check size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
