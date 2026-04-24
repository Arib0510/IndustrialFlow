import React, { useContext } from "react";
import { Outlet } from "react-router-dom";
import { Moon, Sun, PlayCircle, StopCircle, Activity } from "lucide-react";
import { SCADAContext } from "../context/SCADAContext";

export const MainLayout = () => {
  const { isSimulating, isDarkMode, setIsDarkMode, setSimulating } = useContext(SCADAContext);

  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden theme-transition" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      {/* Header Bar */}
      <div className="h-16 flex justify-between items-center px-6 shrink-0 shadow-lg z-40 theme-transition" style={{ backgroundColor: 'var(--bg-panel)', borderBottomWidth: 1, borderBottomStyle: 'solid', borderBottomColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl border" style={{ backgroundColor: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.3)', color: 'var(--accent)' }}>
            <Activity size={18} />
          </div>
          <h1 className="text-base font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
            Enterprise SCADA Designer{' '}
            <span className="text-[10px] px-2 py-0.5 rounded-full ml-2" style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>JointJS App</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button
            onClick={() => setSimulating(!isSimulating)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-md"
            style={isSimulating
              ? { backgroundColor: 'rgba(59,130,246,0.2)', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(59,130,246,0.5)', color: 'var(--accent)' }
              : { backgroundColor: 'var(--bg-panel)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border)', color: 'var(--text-secondary)' }
            }
          >
            {isSimulating ? <StopCircle size={14} className="animate-pulse"/> : <PlayCircle size={14}/>}
            {isSimulating ? 'Stop Simulator' : 'Start Simulator'}
          </button>
        </div>
      </div>

      {/* Pages Layer */}
      <Outlet />
    </div>
  );
};
