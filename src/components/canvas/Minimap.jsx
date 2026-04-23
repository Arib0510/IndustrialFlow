import React, { useRef, useEffect } from "react";
import * as joint from "jointjs";
import { Map } from "lucide-react";

const Minimap = ({ graph, isDarkMode }) => {
  const minimapRef = useRef(null);
  const minimapPaperRef = useRef(null);

  useEffect(() => {
    if (!minimapRef.current || !graph) return;
    const el = document.createElement("div");
    el.style.width = "100%";
    el.style.height = "100%";
    minimapRef.current.appendChild(el);

    const paper = new joint.dia.Paper({
      el,
      model: graph,
      width: "100%",
      height: "100%",
      background: { color: "transparent" },
      interactive: false,
      gridSize: 1,
      drawGrid: false,
      async: true,
      frozen: false,
    });

    // Scale minimap to fit
    paper.scale(0.15, 0.15);
    minimapPaperRef.current = paper;

    return () => {
      paper.remove();
    };
  }, [graph]);

  return (
    <div
      className="absolute bottom-16 left-4 z-40 rounded-lg overflow-hidden shadow-2xl theme-transition"
      style={{
        width: 160, height: 120,
        backgroundColor: isDarkMode ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.9)',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div className="flex items-center gap-1.5 px-2 py-1 border-b" style={{ borderColor: 'var(--border)' }}>
        <Map size={10} style={{ color: 'var(--accent)' }} />
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Minimap</span>
      </div>
      <div ref={minimapRef} className="w-full" style={{ height: 'calc(100% - 24px)' }} />
    </div>
  );
};

export default Minimap;
