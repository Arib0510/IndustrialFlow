import React, { useRef, useEffect, useState } from "react";

export const ResizeOverlay = ({ graph, node, paperRef }) => {
  const containerRef = useRef(null);
  // Keep a local transform state so the handle box moves with zoom/pan
  const [paperTransform, setPaperTransform] = useState({ tx: 0, ty: 0, sx: 1, sy: 1 });

  // Sync position/scale with JointJS paper via rAF
  useEffect(() => {
    let animId;
    const sync = () => {
      if (paperRef?.current) {
        const { sx, sy } = paperRef.current.scale();
        const { tx, ty } = paperRef.current.translate();
        setPaperTransform(prev => {
          if (prev.tx === tx && prev.ty === ty && prev.sx === sx && prev.sy === sy) return prev;
          return { tx, ty, sx, sy };
        });
      }
      animId = requestAnimationFrame(sync);
    };
    sync();
    return () => cancelAnimationFrame(animId);
  }, [paperRef]);

  const { tx, ty, sx, sy } = paperTransform;

  // Computed screen position and size
  const screenX = node.position.x * sx + tx;
  const screenY = node.position.y * sy + ty;
  const screenW = node.size.width * sx;
  const screenH = node.size.height * sy;

  const handlePointerDown = (e, dir) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = node.size.width;
    const startH = node.size.height;
    const startPosX = node.position.x;
    const startPosY = node.position.y;

    const cell = graph.getCell(node.id);
    if (!cell) return;

    const angle = cell.angle() || 0;
    // Get current scale at drag start (don't re-read during drag)
    const scale = paperRef?.current ? paperRef.current.scale().sx : 1;

    const handleMove = (ev) => {
      // Calculate deltas in screen space, then divide by scale to get model space
      const dxScreen = (ev.clientX - startX) / scale;
      const dyScreen = (ev.clientY - startY) / scale;

      // Undo rotation to get local deltas
      const rad = -(angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const dx = dxScreen * cos - dyScreen * sin;
      const dy = dxScreen * sin + dyScreen * cos;

      let newW = startW;
      let newH = startH;
      let newX = startPosX;
      let newY = startPosY;

      if (dir.includes('e')) newW += dx;
      if (dir.includes('w')) {
        newW -= dx;
        const posRad = (angle * Math.PI) / 180;
        newX += dx * Math.cos(posRad);
        newY += dx * Math.sin(posRad);
      }

      if (dir.includes('s')) newH += dy;
      if (dir.includes('n')) {
        newH -= dy;
        const posRad = (angle * Math.PI) / 180;
        newX -= dy * Math.sin(posRad);
        newY += dy * Math.cos(posRad);
      }

      const finalW = Math.max(20, newW);
      const finalH = Math.max(20, newH);

      if (dir.includes('w') && finalW === 20) {
        const diffW = startW - 20;
        const posRad = (angle * Math.PI) / 180;
        newX = startPosX + diffW * Math.cos(posRad);
        newY = startPosY + diffW * Math.sin(posRad);
      }
      if (dir.includes('n') && finalH === 20) {
        const diffH = startH - 20;
        const posRad = (angle * Math.PI) / 180;
        newX = startPosX - diffH * Math.sin(posRad);
        newY = startPosY + diffH * Math.cos(posRad);
      }

      cell.resize(finalW, finalH);
      if (dir.includes('w') || dir.includes('n')) {
        cell.position(newX, newY);
      }
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const handles = [
    { dir: 'nw', style: { top: -6, left: -6, cursor: 'nwse-resize' } },
    { dir: 'n',  style: { top: -6, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' } },
    { dir: 'ne', style: { top: -6, right: -6, cursor: 'nesw-resize' } },
    { dir: 'e',  style: { top: '50%', right: -6, transform: 'translateY(-50%)', cursor: 'ew-resize' } },
    { dir: 'se', style: { bottom: -6, right: -6, cursor: 'nwse-resize' } },
    { dir: 's',  style: { bottom: -6, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' } },
    { dir: 'sw', style: { bottom: -6, left: -6, cursor: 'nesw-resize' } },
    { dir: 'w',  style: { top: '50%', left: -6, transform: 'translateY(-50%)', cursor: 'ew-resize' } },
  ];

  const handleRotateDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const cell = graph.getCell(node.id);
    if (!cell || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const handleRotateMove = (ev) => {
      const dx = ev.clientX - centerX;
      const dy = ev.clientY - centerY;

      let newAngle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (newAngle < 0) newAngle += 360;
      if (ev.shiftKey) newAngle = Math.round(newAngle / 15) * 15;

      cell.rotate(Math.round(newAngle), true);
      cell.set('angle', Math.round(newAngle));
    };

    const handleRotateUp = () => {
      window.removeEventListener('pointermove', handleRotateMove);
      window.removeEventListener('pointerup', handleRotateUp);
    };

    window.addEventListener('pointermove', handleRotateMove);
    window.addEventListener('pointerup', handleRotateUp);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: screenX,
        top: screenY,
        width: screenW,
        height: screenH,
        transform: `rotate(${node.angle || 0}deg)`,
        transformOrigin: 'center center',
        pointerEvents: 'none',
      }}
      className="border-2 border-dashed border-[#3B82F6] z-10"
    >
      {/* Rotation handle */}
      <div
        style={{ top: -30, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto', cursor: 'grab' }}
        className="absolute w-6 h-6 bg-[#3B82F6] rounded-full flex items-center justify-center text-[#1F2933] dark:text-[#E5E7EB] shadow-lg transition-transform hover:scale-110"
        onPointerDown={handleRotateDown}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
      </div>
      {/* Connector line */}
      <div style={{ top: -6, left: '50%', width: 2, height: 24, transform: 'translateX(-50%) translateY(-100%)', backgroundColor: '#3B82F6' }} className="absolute" />

      {handles.map(h => (
        <div
          key={h.dir}
          style={{ ...h.style, pointerEvents: 'auto' }}
          className="absolute w-3 h-3 bg-white border-2 border-[#3B82F6]"
          onPointerDown={(e) => handlePointerDown(e, h.dir)}
        />
      ))}
    </div>
  );
};
