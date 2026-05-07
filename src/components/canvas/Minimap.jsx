import React, { useRef, useEffect } from "react";
import * as joint from "jointjs";
import { Map } from "lucide-react";

const Minimap = ({ graph, paperRef, isDarkMode }) => {
  const containerRef    = useRef(null);
  const miniPaperRef    = useRef(null);
  const viewportRef     = useRef(null);
  const animIdRef       = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !graph) return;

    const el = document.createElement("div");
    el.style.cssText = "position:absolute;inset:0;";
    containerRef.current.appendChild(el);

    const paper = new joint.dia.Paper({
      el,
      model:       graph,
      width:       containerRef.current.clientWidth  || 160,
      height:      containerRef.current.clientHeight || 96,
      background:  { color: "transparent" },
      interactive: false,
      gridSize:    1,
      drawGrid:    false,
      async:       true,
      frozen:      false,
    });
    miniPaperRef.current = paper;

    // Fit all content inside the minimap whenever the graph changes
    const fit = () => {
      if (!graph.getCells().length) return;
      try {
        paper.scaleContentToFit({ padding: 6, minScale: 0.04, maxScale: 0.6 });
      } catch (_) { /* graph may be empty during teardown */ }
    };
    graph.on("add remove change:position change:size", fit);
    fit();

    // RAF loop — sync the viewport rectangle with the main paper's visible area
    const syncViewport = () => {
      const mainP = paperRef?.current;
      const miniP = miniPaperRef.current;
      const vp    = viewportRef.current;
      const cont  = containerRef.current;

      if (mainP && miniP && vp && cont) {
        const ms  = mainP.scale().sx;
        const { tx: mtx, ty: mty } = mainP.translate();
        const mw  = mainP.el.clientWidth;
        const mh  = mainP.el.clientHeight;

        const ns  = miniP.scale().sx;
        const { tx: ntx, ty: nty } = miniP.translate();

        // Visible area in graph-space
        const gx = -mtx / ms;
        const gy = -mty / ms;
        const gw =  mw  / ms;
        const gh =  mh  / ms;

        // Convert to minimap screen coords
        const sx = gx * ns + ntx;
        const sy = gy * ns + nty;
        const sw = gw * ns;
        const sh = gh * ns;

        const cw = cont.clientWidth;
        const ch = cont.clientHeight;

        vp.style.left   = `${Math.max(0, Math.min(sx, cw - 2))}px`;
        vp.style.top    = `${Math.max(0, Math.min(sy, ch - 2))}px`;
        vp.style.width  = `${Math.max(4, Math.min(sw, cw))}px`;
        vp.style.height = `${Math.max(4, Math.min(sh, ch))}px`;
      }

      animIdRef.current = requestAnimationFrame(syncViewport);
    };
    syncViewport();

    return () => {
      cancelAnimationFrame(animIdRef.current);
      graph.off("add remove change:position change:size", fit);
      paper.remove();
      miniPaperRef.current = null;
    };
  }, [graph, paperRef]);

  return (
    <div
      className="absolute bottom-4 right-4 z-40 rounded-lg overflow-hidden shadow-2xl theme-transition"
      style={{
        width: 160, height: 120,
        backgroundColor: isDarkMode ? 'rgba(15,23,42,0.9)' : 'rgba(250,250,250,0.9)',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-1.5 px-2 py-1 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <Map size={10} style={{ color: 'var(--accent)' }} />
        <span className="text-[9px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--text-secondary)' }}>
          Minimap
        </span>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} style={{ position: 'relative', width: '100%', height: 'calc(100% - 24px)' }}>
        {/* Viewport indicator */}
        <div
          ref={viewportRef}
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: 10,
            border: '1.5px solid var(--accent)',
            backgroundColor: 'rgba(59,130,246,0.1)',
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
};

export default Minimap;
