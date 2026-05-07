import React, { useContext, useState, useRef } from "react";
import { Outlet } from "react-router-dom";
import { Moon, Sun, Zap, Square, ChevronRight } from "lucide-react";
import { SCADAContext } from "../context/SCADAContext";

export const MainLayout = () => {
  const { isSimulating, isDarkMode, setIsDarkMode, setSimulating } = useContext(SCADAContext);
  const [projectName, setProjectName] = useState('Plant Layout');
  const inputRef = useRef(null);

  React.useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden theme-transition"
      style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}
    >
      {/* ── Top bar (56px) ──────────────────────────────────────────────── */}
      <div
        className="flex items-center shrink-0 theme-transition"
        style={{
          height: 56,
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-panel)',
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        {/* Monochrome mark */}
        <div style={{ marginRight: 16, flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="1" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.9" />
            <rect x="10" y="1" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.35" />
            <rect x="1" y="10" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.35" />
            <rect x="10" y="10" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.65" />
          </svg>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center" style={{ gap: 4, fontSize: 13 }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, cursor: 'default' }}>
            Projects
          </span>
          <ChevronRight size={12} strokeWidth={1.5} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          {/* Inline editable project name */}
          <input
            ref={inputRef}
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
            onFocus={e => { e.target.style.backgroundColor = 'var(--bg-subtle)'; }}
            onBlur={e => {
              e.target.style.backgroundColor = 'transparent';
              if (!e.target.value.trim()) setProjectName('Untitled');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontWeight: 500,
              fontSize: 13,
              fontFamily: 'inherit',
              padding: '2px 4px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'text',
              minWidth: 20,
              width: `${Math.max(60, projectName.length * 7.8 + 8)}px`,
              maxWidth: 280,
            }}
          />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Keyboard shortcut hint */}
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              padding: '2px 7px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              fontFamily: 'inherit',
              letterSpacing: 0,
              cursor: 'default',
            }}
          >
            ⌘K
          </div>

          {/* Theme toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            style={{
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 'var(--radius-sm)',
              border: 'none', cursor: 'pointer',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            title={isDarkMode ? 'Light mode' : 'Dark mode'}
          >
            {isDarkMode ? <Sun size={15} strokeWidth={1.5} /> : <Moon size={15} strokeWidth={1.5} />}
          </button>

          <div style={{ width: 1, height: 18, backgroundColor: 'var(--border)', flexShrink: 0 }} />

          {/* Run / Running */}
          {isSimulating ? (
            <button
              onClick={() => setSimulating(false)}
              className="flex items-center theme-transition"
              style={{
                height: 32, paddingLeft: 12, paddingRight: 12,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-secondary)',
                fontSize: 13, fontWeight: 500,
                cursor: 'pointer', gap: 8,
                display: 'flex', alignItems: 'center',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'}
            >
              <span
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  backgroundColor: 'var(--status-ok)',
                  animation: 'live-pulse 2s infinite',
                  flexShrink: 0,
                }}
              />
              Running
              <Square size={11} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
            </button>
          ) : (
            <button
              onClick={() => setSimulating(true)}
              style={{
                height: 32, paddingLeft: 14, paddingRight: 14,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: 'var(--accent)',
                color: '#FFFFFF',
                fontSize: 13, fontWeight: 500,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--accent)'}
            >
              <Zap size={13} strokeWidth={1.5} />
              Run
            </button>
          )}
        </div>
      </div>

      <Outlet />
    </div>
  );
};
