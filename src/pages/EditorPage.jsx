/**
 * EditorPage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Main SCADA Canvas Editor — orchestrates all drawing, interaction, and
 * data-binding features across all 7 implementation phases.
 *
 * Phases implemented here:
 *   Phase 1 — Expanded draw tools (polygon, text, image)
 *   Phase 2 — Shape style updates (dash, arrows, opacity, corner radius)
 *   Phase 3 — Tag expression bindings via bindingUtils
 *   Phase 4 — Z-order controls + layers tab wiring
 *   Phase 5 — Full undo/redo via HistoryManager
 *   Phase 6 — Rubber-band multi-select, copy/paste/duplicate
 *   Phase 7 — localStorage save/load (existing, unchanged)
 */

import React, { useState, useRef, useContext, useEffect, useMemo, useCallback } from 'react';
import * as joint from 'jointjs';
import { v4 as uuidv4 } from 'uuid';
import { ZoomIn, ZoomOut, Maximize2, Square } from 'lucide-react';

import { SCADAContext }         from '../context/SCADAContext';
import { ReactWidgetOverlays }  from '../components/canvas/ReactWidgetOverlays';
import { SelectionOverlay }     from '../components/canvas/SelectionOverlay';
import Minimap                  from '../components/canvas/Minimap';
import TagBrowserFloat          from '../components/canvas/TagBrowserFloat';
import BuildCustomNodeModal     from '../components/modals/BuildCustomNodeModal';
import AddDeviceModal           from '../components/modals/AddDeviceModal';

import { EditorSidebar }  from '../features/editor/components/EditorSidebar';
import { EditorToolbar }  from '../features/editor/components/EditorToolbar';
import { NodeInspector }  from '../features/editor/components/NodeInspector';
import { ScadaIcons, getSymbolImagePath, SCADA_SVG_PATHS } from '../features/editor/utils/iconUtils.jsx';

// Phase 1 — Drawing factories
import {
  createRectangle, createEllipse, createLine,
  createTextLabel, createPolygon, createImageShape,
  makePortsConfig, normalizeSortedCells, createFreedrawPath,
  recognizeFreedrawShape,
} from '../features/editor/utils/drawingUtils';

// Phase 3 — Expression binding engine
import { syncAllBindings } from '../features/editor/utils/bindingUtils';

// Phase 3 (group) — Grouping
import { groupCells, ungroupCells } from '../features/editor/utils/groupingUtils';

// Phase 5 — Undo / Redo
import { HistoryManager } from '../features/editor/utils/historyUtils';

// Phase 5+6 — Keyboard shortcuts
import { useEditorKeyboard } from '../hooks/useEditorKeyboard';

// ── Hidden file input for image insertion (Phase 1) ───────────────────────────
const ImageFileInput = React.forwardRef((props, ref) => (
  <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} {...props} />
));
ImageFileInput.displayName = 'ImageFileInput';

// ─────────────────────────────────────────────────────────────────────────────

export const EditorPage = () => {
  const { tags, history, isSimulating, isDarkMode, devices, setDevices, setSimulating } = useContext(SCADAContext);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const canvasRef          = useRef(null);
  const paperRef           = useRef(null);
  const graphRef           = useRef(new joint.dia.Graph());
  const historyRef         = useRef(null);       // Phase 5
  const clipboardRef       = useRef([]);          // Phase 6
  const imageInputRef      = useRef(null);        // Phase 1 (image)
  const imageDropPosRef    = useRef({ x: 200, y: 200 }); // where image will land
  // Drawing state refs (avoids stale closures in paper event handlers)
  const activeDrawToolRef  = useRef(null);
  const isPanModeRef       = useRef(false);
  const isPanningRef       = useRef(false);
  const panStartRef        = useRef({ x: 0, y: 0 });
  const isDrawingShapeRef  = useRef(false);
  const currentDrawShapeRef = useRef(null);
  // Phase 1 — Polygon vertex accumulation (preview rendered as React SVG overlay)
  const polyVerticesRef    = useRef([]);
  // Freehand draw
  const isFreeDrawingRef   = useRef(false);
  const freeDrawPointsRef  = useRef([]);
  const freeDrawSvgRef     = useRef(null);
  // Phase 6 — Rubber-band multi-select
  const isRubberBandRef    = useRef(false);
  const rubberStartRef     = useRef({ x: 0, y: 0 });
  const rubberTransformRef     = useRef({ tx: 0, ty: 0, sx: 1 });
  const suppressGroupResizeRef = useRef(false);
  const suppressGroupRotateRef = useRef(false);

  // ── State ─────────────────────────────────────────────────────────────────
  const [activeTab,             setActiveTab]             = useState('explorer');
  const [selectedCellId,        setSelectedCellId]        = useState(null);
  const [selectedCellIds,       setSelectedCellIds]       = useState([]);   // Phase 6
  const [gridVisible,           setGridVisible]           = useState(true);
  const [snapEnabled,           setSnapEnabled]           = useState(true);
  const [canvasBg,              setCanvasBg]              = useState(isDarkMode ? '#0A0A0A' : '#FAFAFA');
  const [runtimeSecs,           setRuntimeSecs]           = useState(0);
  const runtimeRef              = useRef(null);
  const [cellData,              setCellData]              = useState([]);
  const [showBuildModal,        setShowBuildModal]        = useState(false);
  const [showAddDevice,         setShowAddDevice]         = useState(false);
  const [collapsedCategories,   setCollapsedCategories]   = useState({});
  const [isPanMode,             setIsPanMode]             = useState(false);
  const [activeDrawTool,        setActiveDrawTool]        = useState(null);
  // Phase 5 — undo/redo availability flags (drive button disabled states)
  const [canUndo,               setCanUndo]               = useState(false);
  const [canRedo,               setCanRedo]               = useState(false);
  // UI state — zoom level + canvas cursor coords
  const [zoomLevel,             setZoomLevel]             = useState(100);
  const [cursorPos,             setCursorPos]             = useState({ x: 0, y: 0 });
  // Phase 6 — rubber-band rect for SelectionOverlay
  const [rubberRect,            setRubberRect]            = useState(null);
  const [isRubberBandActive,    setIsRubberBandActive]    = useState(false);
  // Polygon SVG preview state (avoids adding a JointJS cell that intercepts clicks)
  const [polyPreviewVerts,      setPolyPreviewVerts]      = useState([]);
  const [polyTransform,         setPolyTransform]         = useState({ tx: 0, ty: 0, sx: 1 });

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedCell  = selectedCellId ? graphRef.current.getCell(selectedCellId) : null;
  const totalNodes    = cellData.filter(c => c.isNode).length;
  const totalLinks    = cellData.filter(c => c.isLink).length;
  const selectedCount = selectedCellIds.length + (selectedCellId ? 1 : 0);

  // Sync ref → state
  useEffect(() => { isPanModeRef.current  = isPanMode;    }, [isPanMode]);
  useEffect(() => { activeDrawToolRef.current = activeDrawTool; }, [activeDrawTool]);
  useEffect(() => { setCanvasBg(isDarkMode ? '#0A0A0A' : '#FAFAFA'); }, [isDarkMode]);

  // Runtime elapsed counter — starts/stops with simulation
  useEffect(() => {
    if (isSimulating) {
      setRuntimeSecs(0);
      runtimeRef.current = setInterval(() => setRuntimeSecs(s => s + 1), 1000);
    } else {
      clearInterval(runtimeRef.current);
    }
    return () => clearInterval(runtimeRef.current);
  }, [isSimulating]);

  // ── History availability poll ─────────────────────────────────────────────
  const refreshHistoryFlags = useCallback(() => {
    const h = historyRef.current;
    if (!h) return;
    setCanUndo(h.canUndo());
    setCanRedo(h.canRedo());
  }, []);

  // ── Phase 5: undo / redo ──────────────────────────────────────────────────
  const handleUndo = useCallback(() => { historyRef.current?.undo(); refreshHistoryFlags(); }, [refreshHistoryFlags]);
  const handleRedo = useCallback(() => { historyRef.current?.redo(); refreshHistoryFlags(); }, [refreshHistoryFlags]);

  // ── Phase 6: copy / paste / duplicate ────────────────────────────────────
  const handleCopy = useCallback(() => {
    if (!selectedCellId) return;
    const cell = graphRef.current.getCell(selectedCellId);
    if (cell) clipboardRef.current = [cell.toJSON()];
  }, [selectedCellId]);

  const handleCut = useCallback(() => {
    handleCopy();
    if (selectedCellId) {
      graphRef.current.getCell(selectedCellId)?.remove();
      setSelectedCellId(null);
    }
  }, [handleCopy, selectedCellId]);

  const handlePaste = useCallback(() => {
    if (!clipboardRef.current.length) return;
    // Reconstruct cells using a temporary graph, then transfer to main graph
    const tempGraph = new joint.dia.Graph();
    tempGraph.fromJSON({ cells: clipboardRef.current });
    const cloned = tempGraph.getCells().map(c => {
      const clone = c.clone();
      clone.set('id', uuidv4());
      if (!clone.isLink()) clone.translate(20, 20);
      return clone;
    });
    graphRef.current.addCells(cloned);
    if (cloned.length === 1) setSelectedCellId(cloned[0].id);
  }, []);

  const handleDuplicate = useCallback(() => {
    if (!selectedCellId) return;
    const cell = graphRef.current.getCell(selectedCellId);
    if (!cell) return;
    const clone = cell.clone();
    clone.set('id', uuidv4());
    if (!clone.isLink()) clone.translate(20, 20);
    graphRef.current.addCell(clone);
    setSelectedCellId(clone.id);
  }, [selectedCellId]);

  const handleDelete = useCallback(() => {
    if (!selectedCellId) return;
    graphRef.current.getCell(selectedCellId)?.remove();
    setSelectedCellId(null);
  }, [selectedCellId]);

  const handleEscape = useCallback(() => {
    setActiveDrawTool(null);
    polyVerticesRef.current = [];
    setPolyPreviewVerts([]);
    isFreeDrawingRef.current = false;
    freeDrawPointsRef.current = [];
  }, []);

  const handleCommitPolygon = useCallback(() => {
    if (activeDrawToolRef.current !== 'polygon') return;
    const raw = polyVerticesRef.current;
    if (raw.length >= 3) {
      const el = createPolygon({ vertices: raw, isDarkMode });
      graphRef.current.addCell(el);
      setSelectedCellId(el.id);
    }
    polyVerticesRef.current = [];
    setPolyPreviewVerts([]);
    setActiveDrawTool(null);
  }, [isDarkMode]);

  const handleCanvasMouseMove = useCallback((e) => {
    if (!canvasRef.current || !paperRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const { tx, ty } = paperRef.current.translate();
    const { sx }     = paperRef.current.scale();
    setCursorPos({
      x: Math.round((e.clientX - rect.left - tx) / sx),
      y: Math.round((e.clientY - rect.top  - ty) / sx),
    });
  }, []);

  // ── Phase 3 (group): Group / Ungroup ─────────────────────────────────────
  const handleGroup = useCallback(() => {
    const idsToGroup = selectedCellIds.length >= 2 ? selectedCellIds
      : selectedCellId ? [selectedCellId] : [];
    if (idsToGroup.length < 2) return;
    const group = groupCells(graphRef.current, idsToGroup, isDarkMode);
    if (group) { setSelectedCellId(group.id); setSelectedCellIds([]); }
  }, [selectedCellIds, selectedCellId, isDarkMode]);

  const handleUngroup = useCallback(() => {
    if (!selectedCellId) return;
    const released = ungroupCells(graphRef.current, selectedCellId);
    setSelectedCellId(null);
    setSelectedCellIds(released);
  }, [selectedCellId]);

  // ── Phase 4: Z-order ──────────────────────────────────────────────────────
  const bringToFront = useCallback(() => selectedCell?.toFront(), [selectedCell]);
  const sendToBack   = useCallback(() => selectedCell?.toBack(),  [selectedCell]);

  const bringForward = useCallback(() => {
    if (!selectedCell) return;
    const sorted = normalizeSortedCells(graphRef.current);
    const idx = sorted.findIndex(c => c.id === selectedCell.id);
    if (idx >= 0 && idx < sorted.length - 1) {
      sorted[idx].set('z', idx + 1);
      sorted[idx + 1].set('z', idx);
    }
  }, [selectedCell]);

  const sendBackward = useCallback(() => {
    if (!selectedCell) return;
    const sorted = normalizeSortedCells(graphRef.current);
    const idx = sorted.findIndex(c => c.id === selectedCell.id);
    if (idx > 0) {
      sorted[idx].set('z', idx - 1);
      sorted[idx - 1].set('z', idx);
    }
  }, [selectedCell]);

  // ── Zoom controls ─────────────────────────────────────────────────────────
  const zoomIn  = () => { if (paperRef.current) { const s = paperRef.current.scale(); const ns = Math.min(s.sx * 1.2, 4);   paperRef.current.scale(ns); setZoomLevel(Math.round(ns * 100)); } };
  const zoomOut = () => { if (paperRef.current) { const s = paperRef.current.scale(); const ns = Math.max(s.sx / 1.2, 0.2); paperRef.current.scale(ns); setZoomLevel(Math.round(ns * 100)); } };
  const zoomFit = () => { paperRef.current?.scaleContentToFit({ padding: 40 }); setTimeout(() => { const s = paperRef.current?.scale(); if (s) setZoomLevel(Math.round(s.sx * 100)); }, 50); };

  // ── Save / Load / Export ──────────────────────────────────────────────────
  const saveGraph = () => {
    localStorage.setItem('scada_graph_save', JSON.stringify(graphRef.current.toJSON()));
    alert('Layout saved to local storage!');
  };

  // ── Tool-mode callbacks for keyboard shortcuts ────────────────────────────
  const handleSelectMode = useCallback(() => {
    setActiveDrawTool(null);
    setIsPanMode(false);
  }, []);

  const handlePanMode = useCallback(() => {
    setIsPanMode(prev => !prev);
    setActiveDrawTool(null);
  }, []);

  const handleSetDrawTool = useCallback((tool) => {
    setActiveDrawTool(prev => prev === tool ? null : tool);
    setIsPanMode(false);
  }, []);

  // ── Phase 5+6: Keyboard shortcuts ────────────────────────────────────────
  useEditorKeyboard({
    historyRef,
    onCopy:           handleCopy,
    onPaste:          handlePaste,
    onDuplicate:      handleDuplicate,
    onCut:            handleCut,
    onDelete:         handleDelete,
    onEscape:         handleEscape,
    onCommitPolygon:  handleCommitPolygon,
    onSelectMode:     handleSelectMode,
    onPanMode:        handlePanMode,
    onDrawTool:       handleSetDrawTool,
    onGroup:          handleGroup,
    onUngroup:        handleUngroup,
    onSave:           saveGraph,
    onBringToFront:   bringToFront,
    onBringForward:   bringForward,
    onSendBackward:   sendBackward,
    onSendToBack:     sendToBack,
    onZoomIn:         zoomIn,
    onZoomOut:        zoomOut,
    onZoomFit:        zoomFit,
  });

  // ── Phase 3: Tag expression binding sync ─────────────────────────────────
  useEffect(() => {
    if (!graphRef.current) return;
    syncAllBindings(graphRef.current, tags);
  }, [tags]);

  // ── Multi-select: highlight all selected cells with a blue stroke ─────────
  useEffect(() => {
    const paper = paperRef.current;
    if (!paper) return;
    joint.highlighters.stroke.removeAll(paper, 'multi-select');
    selectedCellIds.forEach(id => {
      const cell = graphRef.current.getCell(id);
      if (!cell || cell.isLink()) return;
      const cv = paper.findViewByModel(cell);
      if (!cv) return;
      joint.highlighters.stroke.add(cv, 'body', 'multi-select', {
        attrs: { stroke: '#3B82F6', 'stroke-width': 2.5 },
      });
    });
  }, [selectedCellIds]);

  // ── Group: propagate resize + rotation to embedded children ─────────────
  useEffect(() => {
    const graph = graphRef.current;

    const onResize = (cell) => {
      if (suppressGroupResizeRef.current) return;
      if (cell.get('data')?.category !== 'group') return;
      const oldSize = cell.previous('size');
      const newSize = cell.get('size');
      if (!oldSize || !newSize) return;
      const scaleX = newSize.width  / oldSize.width;
      const scaleY = newSize.height / oldSize.height;
      if (!isFinite(scaleX) || !isFinite(scaleY) || (scaleX === 1 && scaleY === 1)) return;
      const groupPos = cell.get('position');
      suppressGroupResizeRef.current = true;
      cell.getEmbeddedCells().forEach(child => {
        if (child.isLink()) return;
        const cp = child.get('position');
        const cs = child.get('size');
        child.set('position', {
          x: groupPos.x + (cp.x - groupPos.x) * scaleX,
          y: groupPos.y + (cp.y - groupPos.y) * scaleY,
        });
        child.set('size', { width: cs.width * scaleX, height: cs.height * scaleY });
      });
      suppressGroupResizeRef.current = false;
    };

    const onRotate = (cell) => {
      if (suppressGroupRotateRef.current) return;
      if (cell.get('data')?.category !== 'group') return;
      const oldAngle = cell.previous('angle') ?? 0;
      const newAngle = cell.get('angle') ?? 0;
      const delta = newAngle - oldAngle;
      if (delta === 0) return;
      const gs = cell.get('size');
      const gp = cell.get('position');
      const pivotX = gp.x + gs.width  / 2;
      const pivotY = gp.y + gs.height / 2;
      const rad = delta * Math.PI / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      suppressGroupRotateRef.current = true;
      cell.getEmbeddedCells().forEach(child => {
        if (child.isLink()) return;
        const cp = child.get('position');
        const cs = child.get('size');
        const cx = cp.x + cs.width  / 2 - pivotX;
        const cy = cp.y + cs.height / 2 - pivotY;
        child.set('position', {
          x: pivotX + cx * cos - cy * sin - cs.width  / 2,
          y: pivotY + cx * sin + cy * cos - cs.height / 2,
        });
        child.set('angle', (child.get('angle') ?? 0) + delta);
      });
      suppressGroupRotateRef.current = false;
    };

    graph.on('change:size',  onResize);
    graph.on('change:angle', onRotate);
    return () => {
      graph.off('change:size',  onResize);
      graph.off('change:angle', onRotate);
    };
  }, []);

  // ── Cell data sync from graph ─────────────────────────────────────────────
  useEffect(() => {
    const graph = graphRef.current;
    const syncData = () => {
      const mapped = graph.getCells().map(c => {
        const d = c.toJSON();
        const isNode = ['standard.Rectangle','standard.Ellipse','standard.Path','standard.Image','scada.DrawnPath'].includes(d.type);
        if (isNode) {
          return { id: d.id, ...d.data, position: d.position, size: d.size, angle: d.angle || c.angle() || 0, isNode: true, customType: d.type };
        }
        return { id: d.id, isLink: true, source: d.source, target: d.target, ...d.data, customType: d.type };
      });
      setCellData(mapped);
    };
    graph.on('add remove change:position change:size change:angle change:source change:target change:data change:attrs', syncData);
    return () => graph.off('add remove change:position change:size change:angle change:source change:target change:data change:attrs', syncData);
  }, []);

  // ── JointJS paper initialisation ─────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    const graph = graphRef.current;

    // Container
    const paperEl = document.createElement('div');
    paperEl.style.cssText = 'width:100%;height:100%;';
    canvasRef.current.appendChild(paperEl);

    // Port CSS
    const styleId = 'scada-port-styles';
    if (!document.getElementById(styleId)) {
      const s = document.createElement('style');
      s.id = styleId;
      s.textContent = `
        .joint-port-body { visibility: hidden; transition: r 0.1s; }
        .joint-cell:hover .joint-port-body,
        .joint-cell.joint-hover .joint-port-body { visibility: visible !important; }
        .joint-port-body[magnet="true"]:hover { r: 8; }
      `;
      document.head.appendChild(s);
    }

    const gridColor = isDarkMode ? '#27272A' : '#D4D4D8';

    const paper = new joint.dia.Paper({
      el: paperEl,
      model: graph,
      width:  canvasRef.current.clientWidth,
      height: canvasRef.current.clientHeight,
      background: { color: 'transparent' },
      gridSize:  gridVisible ? 20 : 1,
      drawGrid:  gridVisible ? { name: 'dot', args: { color: gridColor, thickness: 1.5 } } : false,
      interactive: (cellView) => {
        const data = cellView.model.get('data') || {};
        // Locked cells cannot be moved
        if (data.locked)               return false;
        // During draw mode, freeze all cell movement
        if (activeDrawToolRef.current) return { elementMove: false, labelMove: false };
        return !isSimulating;
      },
      defaultLink: () => new joint.shapes.standard.Link({
        attrs: {
          line: {
            stroke: isDarkMode ? '#3B82F6' : '#2563EB',
            strokeWidth: 2,
            targetMarker: { type: 'path', d: 'M 10 -5 0 0 10 5 z' },
          },
        },
      }),
      defaultRouter:    { name: 'orthogonal', args: { padding: 10 } },
      defaultConnector: { name: 'rounded',    args: { radius: 8 }   },
      linkPinning:  false,
      snapLinks:    { radius: 20 },
      markAvailable: true,
      validateConnection: (cvS, mS, cvT, mT) => {
        if (cvS === cvT) return false;
        return mT ? mT.getAttribute('magnet') !== 'false' : false;
      },
    });

    paperRef.current = paper;

    // Phase 5 — History
    historyRef.current = new HistoryManager(graph);
    // Listen for any change to refresh the undo/redo button states
    graph.on('add remove change', () => {
      setCanUndo(historyRef.current.canUndo());
      setCanRedo(historyRef.current.canRedo());
    });

    // ── blank:pointerdown ─────────────────────────────────────────────────
    paper.on('blank:pointerdown', (evt, x, y) => {
      paper.hideTools(); // dismiss any active link-editing tools
      const tool = activeDrawToolRef.current;

      if (tool) {
        // ── Image tool: open file picker ────────────────────────────────
        if (tool === 'image') {
          imageDropPosRef.current = { x, y };
          imageInputRef.current?.click();
          return;
        }

        // ── Text tool: single-click place ───────────────────────────────
        if (tool === 'text') {
          const el = createTextLabel({ x, y, isDarkMode });
          graph.addCell(el);
          setSelectedCellId(el.id);
          setActiveDrawTool(null);
          return;
        }

        // ── Polygon: accumulate vertices (React SVG overlay, no JointJS cell) ──
        if (tool === 'polygon') {
          polyVerticesRef.current.push({ x, y });
          // Read current paper transform so the SVG overlay stays aligned
          const { tx, ty } = paper.translate();
          const { sx }     = paper.scale();
          setPolyTransform({ tx, ty, sx });
          setPolyPreviewVerts([...polyVerticesRef.current]);
          return;
        }

        // ── Free draw: start collecting points ──────────────────────────
        if (tool === 'freeDraw') {
          const pt = paper.clientToLocalPoint(evt.clientX, evt.clientY);
          freeDrawPointsRef.current = [{ x: pt.x, y: pt.y }];
          isFreeDrawingRef.current  = true;
          const { tx, ty } = paper.translate();
          const { sx }     = paper.scale();
          setPolyTransform({ tx, ty, sx });
          return;
        }

        // ── Rect / Ellipse / Line: start drag ───────────────────────────
        isDrawingShapeRef.current = true;
        panStartRef.current = { x, y };

        let element;
        if      (tool === 'rectangle') element = createRectangle({ x, y, isDarkMode });
        else if (tool === 'ellipse')   element = createEllipse({   x, y, isDarkMode });
        else if (tool === 'line')      element = createLine({       x, y, isDarkMode });

        if (element) {
          currentDrawShapeRef.current = element;
          graph.addCell(element);
          setSelectedCellId(element.id);
        }
        return;
      }

      // ── Pan mode ─────────────────────────────────────────────────────
      if (isPanModeRef.current) {
        isPanningRef.current = true;
        const { tx, ty } = paper.translate();
        panStartRef.current = { x: evt.clientX - tx, y: evt.clientY - ty };
        document.body.style.cursor = 'grabbing';
        return;
      }

      // ── Rubber-band multi-select ──────────────────────────────────────
      isRubberBandRef.current = true;
      rubberStartRef.current  = { x, y };
      const { tx: rtx, ty: rty } = paper.translate();
      const { sx: rsx }           = paper.scale();
      rubberTransformRef.current  = { tx: rtx, ty: rty, sx: rsx };
      setRubberRect({ x: x * rsx + rtx, y: y * rsx + rty, w: 0, h: 0 });
      setIsRubberBandActive(true);
      setSelectedCellId(null);
      setSelectedCellIds([]);
    });

    // ── blank:pointermove ─────────────────────────────────────────────────
    paper.on('blank:pointermove', (evt, x, y) => {
      if (isDrawingShapeRef.current && currentDrawShapeRef.current) {
        const sx = panStartRef.current.x, sy = panStartRef.current.y;
        const el = currentDrawShapeRef.current;
        if (activeDrawToolRef.current === 'line') {
          el.target({ x, y });
        } else {
          el.position(x < sx ? x : sx, y < sy ? y : sy);
          el.resize(Math.max(1, Math.abs(x - sx)), Math.max(1, Math.abs(y - sy)));
        }
      }
      if (isRubberBandRef.current) {
        const { tx, ty, sx: rsx } = rubberTransformRef.current;
        const bx = rubberStartRef.current.x, by = rubberStartRef.current.y;
        setRubberRect({ x: bx * rsx + tx, y: by * rsx + ty, w: (x - bx) * rsx, h: (y - by) * rsx });
      }
    });

    // ── blank:pointerup ───────────────────────────────────────────────────
    paper.on('blank:pointerup', (evt, x, y) => {
      if (isDrawingShapeRef.current) {
        const drawnTool = activeDrawToolRef.current;
        const drawnEl   = currentDrawShapeRef.current;
        isDrawingShapeRef.current   = false;
        currentDrawShapeRef.current = null;
        if (drawnTool !== 'polygon') setActiveDrawTool(null);

        // Fix 2: After drawing a line, show link tools so user can drag
        // endpoints to snap onto block ports
        if (drawnTool === 'line' && drawnEl) {
          setTimeout(() => {
            const lv = paper.findViewByModel(drawnEl);
            if (lv) showLinkTools(lv);
          }, 60);
        }
      }
      if (isRubberBandRef.current) {
        // Collect cells inside rubber band
        const sx = rubberStartRef.current.x, sy = rubberStartRef.current.y;
        const band = {
          x: Math.min(sx, x), y: Math.min(sy, y),
          width: Math.abs(x - sx), height: Math.abs(y - sy),
        };
        if (band.width > 5 && band.height > 5) {
          const selected = graph.getCells().filter(c => {
            if (c.isLink()) return false;
            const bbox = c.getBBox();
            return bbox &&
              bbox.x < band.x + band.width  &&
              bbox.x + bbox.width  > band.x &&
              bbox.y < band.y + band.height &&
              bbox.y + bbox.height > band.y;
          });
          if (selected.length === 1) {
            setSelectedCellIds([]);
            setSelectedCellId(selected[0].id);
          } else {
            setSelectedCellIds(selected.map(c => c.id));
            setSelectedCellId(null);
          }
        }
        isRubberBandRef.current  = false;
        setRubberRect(null);
        setIsRubberBandActive(false);
      }
    });

    // ── blank:pointerdblclick — close polygon ─────────────────────────────
    // NOTE: JointJS fires blank:pointerdown once for each click of the dblclick,
    // so the last vertex is a duplicate from the second click — remove it.
    paper.on('blank:pointerdblclick', () => {
      if (activeDrawToolRef.current === 'polygon') {
        const raw   = polyVerticesRef.current;
        const verts = raw.length > 3 ? raw.slice(0, -1) : raw; // drop duplicate
        if (verts.length >= 3) {
          const el = createPolygon({ vertices: verts, isDarkMode });
          graph.addCell(el);
          setSelectedCellId(el.id);
        }
        polyVerticesRef.current = [];
        setPolyPreviewVerts([]);
        setActiveDrawTool(null);
      }
    });

    // ── blank:contextmenu — right-click to close polygon ─────────────────
    paper.on('blank:contextmenu', (evt) => {
      if (activeDrawToolRef.current === 'polygon') {
        evt.preventDefault?.();
        const raw = polyVerticesRef.current;
        if (raw.length >= 3) {
          const el = createPolygon({ vertices: raw, isDarkMode });
          graph.addCell(el);
          setSelectedCellId(el.id);
        }
        polyVerticesRef.current = [];
        setPolyPreviewVerts([]);
        setActiveDrawTool(null);
      }
    });

    // ── cell:pointerdown — start free draw even when mouse is over a cell ─
    paper.on('cell:pointerdown', (cellView, evt) => {
      if (activeDrawToolRef.current === 'freeDraw') {
        const pt = paper.clientToLocalPoint(evt.clientX, evt.clientY);
        freeDrawPointsRef.current = [{ x: pt.x, y: pt.y }];
        isFreeDrawingRef.current  = true;
        const { tx, ty } = paper.translate();
        const { sx }     = paper.scale();
        setPolyTransform({ tx, ty, sx });
      }
    });

    // ── Helper: attach link editing tools to a link view ─────────────────
    const showLinkTools = (linkView) => {
      paper.hideTools();
      linkView.addTools(new joint.dia.ToolsView({
        tools: [
          new joint.linkTools.Vertices({ snapRadius: 20, redundancyRemoval: false }),
          new joint.linkTools.Segments({ snapRadius: 20 }),
          // Fix 2: SourceArrowhead & TargetArrowhead let user drag endpoints to ports
          new joint.linkTools.SourceArrowhead(),
          new joint.linkTools.TargetArrowhead(),
          new joint.linkTools.Remove({ distance: 20 }),
        ],
      }));
    };

    // ── Fix 4: show link tools when a link is clicked ─────────────────────
    paper.on('link:pointerclick', (linkView) => {
      showLinkTools(linkView);
      setSelectedCellId(linkView.model.id);
    });

    // Hide link tools when clicking blank canvas or a non-link element
    paper.on('blank:pointerdown', () => paper.hideTools());

    // ── cell:pointerup ────────────────────────────────────────────────────
    paper.on('cell:pointerup', (cellView, evt) => {
      const id     = cellView.model.id;
      const isCtrl = evt?.ctrlKey || evt?.metaKey;
      if (!isDrawingShapeRef.current) {
        if (isCtrl) {
          setSelectedCellIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
          );
          setSelectedCellId(null);
        } else {
          setSelectedCellId(id);
          setSelectedCellIds([]);
        }
      }
      if (cellView.model.isLink() && !isDrawingShapeRef.current && !isCtrl) {
        showLinkTools(cellView);
      }
    });

    // ── Pan + FreeDraw: mouse move / up on document ───────────────────────
    const handlePanMove = (e) => {
      if (isPanningRef.current && paperRef.current) {
        paperRef.current.translate(e.clientX - panStartRef.current.x, e.clientY - panStartRef.current.y);
      }
      if (isFreeDrawingRef.current && paperRef.current) {
        const pt = paperRef.current.clientToLocalPoint(e.clientX, e.clientY);
        freeDrawPointsRef.current.push({ x: pt.x, y: pt.y });
        if (freeDrawSvgRef.current) {
          const pts = freeDrawPointsRef.current;
          freeDrawSvgRef.current.setAttribute('points', pts.map(p => `${p.x},${p.y}`).join(' '));
        }
      }
    };
    const handlePanEnd = () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        document.body.style.cursor = '';
      }
      if (isDrawingShapeRef.current) {
        isDrawingShapeRef.current   = false;
        currentDrawShapeRef.current = null;
        if (activeDrawToolRef.current !== 'polygon') setActiveDrawTool(null);
      }
      if (isFreeDrawingRef.current) {
        isFreeDrawingRef.current = false;
        const pts = freeDrawPointsRef.current;
        if (pts.length >= 2) {
          const recognized = recognizeFreedrawShape(pts);
          let el = null;

          if (recognized) {
            if (recognized.type === 'ellipse') {
              el = createEllipse({ x: recognized.x, y: recognized.y, isDarkMode });
              el.set('size', { width: Math.max(4, recognized.w), height: Math.max(4, recognized.h) });
            } else if (recognized.type === 'rectangle') {
              el = createRectangle({ x: recognized.x, y: recognized.y, isDarkMode });
              el.set('size', { width: Math.max(4, recognized.w), height: Math.max(4, recognized.h) });
            } else if (recognized.type === 'triangle') {
              el = createPolygon({ vertices: recognized.vertices, isDarkMode });
            } else if (recognized.type === 'line') {
              el = createLine({ x: recognized.x1, y: recognized.y1, isDarkMode });
              el.target({ x: recognized.x2, y: recognized.y2 });
            }
          }

          if (!el) {
            el = createFreedrawPath({ points: pts, isDarkMode });
          }

          if (el) {
            graph.addCell(el);
            setSelectedCellId(el.id);
          }
        }
        freeDrawPointsRef.current = [];
        if (freeDrawSvgRef.current) freeDrawSvgRef.current.setAttribute('points', '');
        setActiveDrawTool(null);
      }
    };
    document.addEventListener('mousemove', handlePanMove);
    document.addEventListener('mouseup',   handlePanEnd);

    return () => {
      document.removeEventListener('mousemove', handlePanMove);
      document.removeEventListener('mouseup',   handlePanEnd);
      historyRef.current?.destroy();
      paper.remove();
      paperRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridVisible, isSimulating, isDarkMode]);

  // ── Image file selection handler ──────────────────────────────────────────
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const img = new window.Image();
      img.onload = () => {
        const aspect = img.width / img.height;
        const w = Math.min(img.width, 200);
        const h = Math.round(w / aspect);
        const el = createImageShape({ ...imageDropPosRef.current, dataUrl, width: w, height: h });
        graphRef.current.addCell(el);
        setSelectedCellId(el.id);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset so same file can be chosen again
    setActiveDrawTool(null);
  };

  // ── Load / Export ─────────────────────────────────────────────────────────
  const loadGraph = () => {
    const saved = localStorage.getItem('scada_graph_save');
    if (saved) { graphRef.current.fromJSON(JSON.parse(saved)); }
    else { alert('No saved layout found.'); }
  };
  const exportGraph = () => {
    const json = JSON.stringify(graphRef.current.toJSON(), null, 2);
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([json], { type: 'application/json' })),
      download: 'scada_layout.json',
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const resetCanvas = () => {
    if (window.confirm('Clear the entire canvas?')) {
      graphRef.current.clear();
      setSelectedCellId(null);
      setSelectedCellIds([]);
    }
  };

  // ── Drag & drop from sidebar ──────────────────────────────────────────────
  const onDrop = (e) => {
    e.preventDefault();
    if (isSimulating || !canvasRef.current) return;
    const rawData = e.dataTransfer.getData('application/scada');
    if (!rawData) return;
    const data = JSON.parse(rawData);
    if (!data.t) return;
    const rect = canvasRef.current.getBoundingClientRect();
    addNodeToGraph(data, e.clientX - rect.left, e.clientY - rect.top);
  };

  // ── addNodeToGraph ────────────────────────────────────────────────────────
  const addNodeToGraph = (data, x, y) => {
    const graph = graphRef.current;
    const defaultSizes = {
      tagNode: { w: 180, h: 80 }, line_chart: { w: 400, h: 250 }, bar_chart: { w: 400, h: 250 },
      tank_level: { w: 120, h: 180 }, battery_level: { w: 160, h: 120 }, gauge_dial: { w: 140, h: 140 },
      valve_control: { w: 80, h: 80 }, progress_bar: { w: 220, h: 100 }, alert_banner: { w: 260, h: 80 },
      status_led: { w: 120, h: 100 }, motor_status: { w: 140, h: 100 }, value_control: { w: 160, h: 100 },
      digital_readout: { w: 140, h: 80 }, temp_display: { w: 140, h: 100 }, toggle_switch: { w: 160, h: 80 },
      header_text: { w: 300, h: 50 }, scadavis_symbol: { w: 120, h: 100 },
      // Electrical
      breaker_symbol: { w: 60, h: 90 }, disconnector_symbol: { w: 60, h: 90 },
      transformer_symbol: { w: 60, h: 100 }, fuse_symbol: { w: 60, h: 80 },
      bus_bar: { w: 180, h: 60 }, ground_symbol: { w: 60, h: 70 },
      // Piping
      pipe_horz: { w: 150, h: 40 }, pipe_vert: { w: 40, h: 150 },
      elbow_br: { w: 80, h: 80 }, elbow_bl: { w: 80, h: 80 },
      elbow_tr: { w: 80, h: 80 }, elbow_tl: { w: 80, h: 80 },
      pipe_tee_h: { w: 120, h: 80 }, pipe_tee_v: { w: 80, h: 120 },
      pipe_cross:  { w: 80, h: 80 },
    };
    const sz = defaultSizes[data.t] || { w: 120, h: 80 };
    const portsConfig = makePortsConfig();
    let element;

    const imgPath = getSymbolImagePath(data.t, data.props.color);
    if (imgPath) {
      element = new joint.shapes.standard.Image({
        id: uuidv4(), position: { x, y }, size: { width: sz.w, height: sz.h },
        attrs: {
          image: { 'xlink:href': imgPath, preserveAspectRatio: 'none' },
          label: { text: data.props.name || '', fill: isDarkMode ? '#CBD5E1' : '#1e293b', refY: '100%', refY2: 15, textAnchor: 'middle' },
        },
        ports: portsConfig,
        data: { ...data.props, category: data.t },
      });
    } else if (SCADA_SVG_PATHS[data.t]) {
      element = new joint.shapes.standard.Path({
        id: uuidv4(), position: { x, y }, size: { width: sz.w, height: sz.h },
        attrs: {
          body: {
            d: SCADA_SVG_PATHS[data.t],
            fill: data.props.color || 'transparent',
            stroke: data.props.stroke || (isDarkMode ? '#CBD5E1' : '#1e293b'),
            strokeWidth: 2.5, strokeLinejoin: 'round', strokeLinecap: 'round', vectorEffect: 'non-scaling-stroke',
          },
          label: { text: data.props.name || '', fill: isDarkMode ? '#CBD5E1' : '#1e293b', refY: '100%', refY2: 15, textAnchor: 'middle' },
        },
        ports: portsConfig,
        data: { ...data.props, category: data.t },
      });
    } else {
      element = new joint.shapes.standard.Rectangle({
        id: uuidv4(), position: { x, y }, size: { width: sz.w, height: sz.h },
        attrs: { body: { fill: 'transparent', stroke: 'transparent', strokeWidth: 0, rx: 4, ry: 4 }, label: { text: '', fill: 'transparent' } },
        ports: portsConfig,
        data: { ...data.props, category: data.t },
      });
    }

    graph.addCell(element);
    setSelectedCellId(element.id);
  };

  // ── Update selected cell property ─────────────────────────────────────────
  const updateSelectedCell = (prop, value) => {
    if (!selectedCell) return;
    const data = selectedCell.get('data') || {};
    selectedCell.set('data', { ...data, [prop]: value });

    switch (prop) {
      case 'color':
      case 'stroke': {
        const t = selectedCell.attributes.type;
        if (t === 'standard.Image') {
          const img = getSymbolImagePath(selectedCell.get('data').category, value);
          if (img) selectedCell.attr('image/xlink:href', img);
        } else if (t === 'standard.Path' ||
                   t === 'scada.DrawnPath')     { selectedCell.attr('body/stroke', value); }
        else if (t === 'standard.Rectangle' ||
                 t === 'standard.Ellipse')      { selectedCell.attr('body/stroke', value); }
        else if (selectedCell.isLink())         { selectedCell.attr('line/stroke', value); }
        break;
      }
      case 'fill': {
        if (!selectedCell.isLink()) selectedCell.attr('body/fill', value);
        break;
      }
      default: break;
    }
  };

  const updateSelectedCellSize = (w, h) => {
    if (selectedCell && !selectedCell.isLink()) selectedCell.resize(w, h);
  };

  const deleteSelected = () => {
    if (selectedCell) { selectedCell.remove(); setSelectedCellId(null); }
  };

  // ── Tag options memo ──────────────────────────────────────────────────────
  const tagOptions = useMemo(() => Object.keys(tags).map(k => ({ label: k, value: k })), [tags]);

  // ── Toolbox definition ────────────────────────────────────────────────────
  const toolbox = [
    { cat: 'Industrial Nodes', items: [
      { t: 'tank_level',      l: 'Storage Tank',   i: ScadaIcons.Tank,     props: { name: 'Tank 01',       color: '#3B82F6', unit: '%'  } },
      { t: 'motor_status',    l: 'Pump / Motor',   i: ScadaIcons.Pump,     props: { name: 'Pump A',        color: '#3B82F6'             } },
      { t: 'valve_control',   l: 'Ctrl Valve',     i: ScadaIcons.Valve,    props: { name: 'Valve',         color: '#EF4444', val: false  } },
      { t: 'progress_bar',    l: 'Cap. Bar',        i: ScadaIcons.Progress, props: { name: 'Capacity',      color: '#8B5CF6', unit: 'U'  } },
      { t: 'scadavis_symbol', l: 'Facility',        i: ScadaIcons.Facility, props: { name: 'Plant A',       color: '#64748B'             } },
    ]},
    { cat: 'Piping & Routing', items: [
      { t: 'pipe_horz',  l: 'Horz Pipe', i: ScadaIcons.PipeH,    props: { name: 'Pipe H',  color: '#3B82F6', stroke: '#3B82F6' } },
      { t: 'pipe_vert',  l: 'Vert Pipe', i: ScadaIcons.PipeV,    props: { name: 'Pipe V',  color: '#3B82F6', stroke: '#3B82F6' } },
      { t: 'elbow_br',   l: 'Elbow ↘',   i: ScadaIcons.Elbow,    props: { name: 'Elbow',   color: '#3B82F6', stroke: '#3B82F6' } },
      { t: 'elbow_bl',   l: 'Elbow ↙',   i: ScadaIcons.ElbowBL,  props: { name: 'Elbow',   color: '#3B82F6', stroke: '#3B82F6' } },
      { t: 'elbow_tr',   l: 'Elbow ↗',   i: ScadaIcons.ElbowTR,  props: { name: 'Elbow',   color: '#3B82F6', stroke: '#3B82F6' } },
      { t: 'elbow_tl',   l: 'Elbow ↖',   i: ScadaIcons.ElbowTL,  props: { name: 'Elbow',   color: '#3B82F6', stroke: '#3B82F6' } },
      { t: 'pipe_tee_h', l: 'Tee ↓',     i: ScadaIcons.TeeH,     props: { name: 'Tee H',   color: '#3B82F6', stroke: '#3B82F6' } },
      { t: 'pipe_tee_v', l: 'Tee →',     i: ScadaIcons.TeeV,     props: { name: 'Tee V',   color: '#3B82F6', stroke: '#3B82F6' } },
      { t: 'pipe_cross', l: 'Cross',     i: ScadaIcons.Cross,    props: { name: 'Cross',   color: '#3B82F6', stroke: '#3B82F6' } },
    ]},
    { cat: 'Electrical Substation', items: [
      { t: 'breaker_symbol',      l: 'Breaker',     i: ScadaIcons.Breaker,      props: { name: 'CB-01',  color: '#EF4444', stroke: '#EF4444' } },
      { t: 'disconnector_symbol', l: 'Disconnect',  i: ScadaIcons.Disconnector, props: { name: 'DS-01',  color: '#F59E0B', stroke: '#F59E0B' } },
      { t: 'transformer_symbol',  l: 'Transformer', i: ScadaIcons.Transformer,  props: { name: 'TR-01',  color: '#8B5CF6', stroke: '#8B5CF6' } },
      { t: 'fuse_symbol',         l: 'Fuse',        i: ScadaIcons.Fuse,         props: { name: 'FS-01',  color: '#F59E0B', stroke: '#F59E0B' } },
      { t: 'bus_bar',             l: 'Bus Bar',     i: ScadaIcons.BusBar,       props: { name: 'BUS-1',  color: '#64748B', stroke: '#64748B' } },
      { t: 'ground_symbol',       l: 'Ground',      i: ScadaIcons.Ground,       props: { name: 'GND',    color: '#10B981', stroke: '#10B981' } },
    ]},
    { cat: 'Controls & Displays', items: [
      { t: 'toggle_switch',   l: 'Switch',      i: ScadaIcons.Toggle,    props: { name: 'Switch',    val: false,               color: '#10B981' } },
      { t: 'value_control',   l: 'Adjuster',    i: ScadaIcons.Slider,    props: { name: 'Setpoint',  val: 0,                   color: '#3B82F6' } },
      { t: 'gauge_dial',      l: 'Analog Dial', i: ScadaIcons.Gauge,     props: { name: 'Pressure',  color: '#3B82F6', unit: 'PSI'            } },
      { t: 'digital_readout', l: 'LCD Display', i: ScadaIcons.LCD,       props: { name: 'Live Data', color: '#10B981', unit: ''               } },
      { t: 'temp_display',    l: 'Numeric',     i: ScadaIcons.Temp,      props: { name: 'Display',   color: '#3B82F6', unit: '°C'             } },
    ]},
    { cat: 'Status & Alerts', items: [
      { t: 'status_led',    l: 'Status LED', i: ScadaIcons.LED,     props: { name: 'Indicator',      val: false, color: '#10B981' } },
      { t: 'battery_level', l: 'Battery',    i: ScadaIcons.Battery, props: { name: 'Battery Bank',   val: 100,   color: '#10B981' } },
      { t: 'alert_banner',  l: 'Warning',    i: ScadaIcons.Alert,   props: { name: 'System Warning', val: false, color: '#EF4444' } },
      { t: 'header_text',   l: 'Header',     i: ScadaIcons.Text,    props: { name: 'Area Label',     color: '#71717A'            } },
    ]},
    { cat: 'Analytics', items: [
      { t: 'line_chart', l: 'Trend View', i: ScadaIcons.LineChart, props: { name: 'History', color: '#3B82F6' } },
      { t: 'bar_chart',  l: 'Volume Bar', i: ScadaIcons.BarChart,  props: { name: 'Volume',  color: '#8B5CF6' } },
    ]},
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full flex-1 min-h-0 flex flex-col theme-transition" style={{ backgroundColor: 'var(--bg-main)' }}>

      {/* Hidden image file input */}
      <ImageFileInput ref={imageInputRef} onChange={handleImageFileChange} />

      {/* Toolbar */}
      <EditorToolbar
        activeTab={activeTab}          setActiveTab={setActiveTab}
        isPanMode={isPanMode}          setIsPanMode={setIsPanMode}
        activeDrawTool={activeDrawTool} setActiveDrawTool={setActiveDrawTool}
        gridVisible={gridVisible}      setGridVisible={setGridVisible}
        snapEnabled={snapEnabled}      setSnapEnabled={setSnapEnabled}
        canUndo={canUndo}              canRedo={canRedo}
        onUndo={handleUndo}            onRedo={handleRedo}
        onCopy={handleCopy}            onPaste={handlePaste}
        onDuplicate={handleDuplicate}  onCut={handleCut}
        onBringToFront={bringToFront}  onBringForward={bringForward}
        onSendBackward={sendBackward}  onSendToBack={sendToBack}
        onGroup={handleGroup}          onUngroup={handleUngroup}
        saveGraph={saveGraph}          loadGraph={loadGraph}
        exportGraph={exportGraph}      resetCanvas={resetCanvas}
        isSimulating={isSimulating}
        selectedCount={selectedCount}
        selectedCellIds={selectedCellIds}
      />

      {/* ── Page Tab Bar ──────────────────────────────────────────────────── */}
      {!isSimulating && (
        <div
          className="flex items-center shrink-0 theme-transition"
          style={{ height: 28, backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border)' }}
        >
          {/* Active page tab */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              height: 28, paddingLeft: 14, paddingRight: 12,
              borderRight: '1px solid var(--border)',
              backgroundColor: 'var(--bg-canvas)',
              borderBottom: '2px solid var(--accent)',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
              Plant Layout
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1, cursor: 'default' }}>×</span>
          </div>

          {/* Zoom controls on the right */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 1, paddingRight: 8 }}>
            {[
              { fn: zoomOut, Icon: ZoomOut,   title: 'Zoom Out'    },
              { fn: zoomIn,  Icon: ZoomIn,    title: 'Zoom In'     },
              { fn: zoomFit, Icon: Maximize2, title: 'Fit to View' },
            ].map(({ fn, Icon, title }) => (
              <button
                key={title} onClick={fn} title={title}
                style={{ width: 26, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Icon size={12} />
              </button>
            ))}
            <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-secondary)', minWidth: 42, textAlign: 'center' }}>
              {zoomLevel}%
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">

        {/* Sidebar */}
        <EditorSidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSimulating={isSimulating}
          isDarkMode={isDarkMode}
          devices={devices}
          collapsedCategories={collapsedCategories}
          setCollapsedCategories={setCollapsedCategories}
          setShowAddDevice={setShowAddDevice}
          setShowBuildModal={setShowBuildModal}
          toolbox={toolbox}
          graph={graphRef.current}
          cellData={cellData}
          selectedCellId={selectedCellId}
          onSelectCell={id => { setSelectedCellId(id); setSelectedCellIds([]); }}
        />

        {/* Canvas */}
        <div
          className="flex-1 relative flex flex-col transition-colors"
          style={{
            backgroundColor: canvasBg,
            cursor: isPanMode ? 'grab' : activeDrawTool ? 'crosshair' : 'default',
          }}
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onMouseMove={handleCanvasMouseMove}
        >
          <div ref={canvasRef} className="absolute inset-0 z-0 overflow-hidden" />

          {/* Widget overlays */}
          <ReactWidgetOverlays
            graph={graphRef.current}
            nodes={cellData.filter(c => c.isNode)}
            history={history}
            selectedCellId={selectedCellId}
            paperRef={paperRef}
          />

          {/* Rubber-band selection overlay */}
          <SelectionOverlay active={isRubberBandActive} rect={rubberRect} />

          {/* Fix 1: Polygon draw preview — React SVG overlay (does NOT block JointJS events) */}
          {activeDrawTool === 'polygon' && polyPreviewVerts.length > 0 && (
            <svg
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 15 }}
            >
              <g transform={`translate(${polyTransform.tx},${polyTransform.ty}) scale(${polyTransform.sx})`}>
                {polyPreviewVerts.length >= 2 && (
                  <polyline
                    points={polyPreviewVerts.map(v => `${v.x},${v.y}`).join(' ')}
                    fill="none" stroke="#8B5CF6" strokeWidth={2 / polyTransform.sx} strokeDasharray={`${6 / polyTransform.sx} ${4 / polyTransform.sx}`}
                  />
                )}
                {polyPreviewVerts.length >= 3 && (
                  <line
                    x1={polyPreviewVerts[polyPreviewVerts.length - 1].x}
                    y1={polyPreviewVerts[polyPreviewVerts.length - 1].y}
                    x2={polyPreviewVerts[0].x} y2={polyPreviewVerts[0].y}
                    stroke="#8B5CF6" strokeWidth={1 / polyTransform.sx}
                    strokeDasharray={`${3 / polyTransform.sx} ${5 / polyTransform.sx}`} opacity={0.5}
                  />
                )}
                {polyPreviewVerts.map((v, i) => (
                  <circle key={i} cx={v.x} cy={v.y}
                    r={5 / polyTransform.sx}
                    fill={i === 0 ? '#22C55E' : '#8B5CF6'}
                    stroke="white" strokeWidth={1.5 / polyTransform.sx}
                  />
                ))}
              </g>
            </svg>
          )}

          {/* Free draw preview — DOM ref updated directly for performance */}
          {activeDrawTool === 'freeDraw' && (
            <svg
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 15 }}
            >
              <g transform={`translate(${polyTransform.tx},${polyTransform.ty}) scale(${polyTransform.sx})`}>
                <polyline
                  ref={freeDrawSvgRef}
                  points=""
                  fill="none"
                  stroke="#8B5CF6"
                  strokeWidth={2 / polyTransform.sx}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </svg>
          )}

          {/* Tag browser — bottom-left floating panel (visible in edit + run mode) */}
          <TagBrowserFloat isDarkMode={isDarkMode} />

          {/* Minimap — bottom-right */}
          {!isSimulating && <Minimap graph={graphRef.current} paperRef={paperRef} isDarkMode={isDarkMode} />}

          {/* Run mode — frosted floating status bar */}
          {isSimulating && (
            <div
              className="frosted theme-transition"
              style={{
                position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '7px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                backgroundColor: isDarkMode ? 'rgba(17,17,19,0.82)' : 'rgba(250,250,250,0.82)',
                boxShadow: 'var(--shadow-md)',
                zIndex: 50,
                fontSize: 11, color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--status-ok)', animation: 'live-pulse 2s infinite', flexShrink: 0 }} />
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Running</span>
              </span>
              <span style={{ color: 'var(--border-strong)' }}>│</span>
              <span style={{ fontFamily: 'JetBrains Mono, Geist Mono, monospace', fontSize: 10 }}>
                {String(Math.floor(runtimeSecs / 60)).padStart(2,'0')}:{String(runtimeSecs % 60).padStart(2,'0')}
              </span>
              <span style={{ color: 'var(--border-strong)' }}>│</span>
              <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{totalNodes} nodes</span>
              <span style={{ color: 'var(--border-strong)' }}>│</span>
              <button
                onClick={() => setSimulating(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  height: 24, paddingLeft: 10, paddingRight: 10,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 11, cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                title="Stop simulation (use the Running button in the top bar)"
              >
                <Square size={10} strokeWidth={1.5} />
                Stop
              </button>
            </div>
          )}

        </div>

        {/* Node Inspector */}
        <NodeInspector
          isSimulating={isSimulating}
          selectedCell={selectedCell}
          updateSelectedCell={updateSelectedCell}
          tagOptions={tagOptions}
          updateSelectedCellSize={updateSelectedCellSize}
          deleteSelected={deleteSelected}
          activeDrawTool={activeDrawTool}
          canvasBg={canvasBg}
          setCanvasBg={setCanvasBg}
          totalNodes={totalNodes}
          totalLinks={totalLinks}
        />
      </div>

      {/* ── Status Bar ────────────────────────────────────────────────────── */}
      <div
        className="flex items-center shrink-0 theme-transition"
        style={{
          height: 22,
          backgroundColor: 'var(--bg-panel)',
          borderTop: '1px solid var(--border)',
          paddingLeft: 12, paddingRight: 12,
          fontSize: 10, color: 'var(--text-muted)',
          fontFamily: 'monospace',
          gap: 0,
        }}
      >
        <span>x:&nbsp;{cursorPos.x}&nbsp;&nbsp;y:&nbsp;{cursorPos.y}</span>
        <span style={{ margin: '0 8px', color: 'var(--border-strong)' }}>│</span>
        <span>{totalNodes} node{totalNodes !== 1 ? 's' : ''}</span>
        <span style={{ margin: '0 8px', color: 'var(--border-strong)' }}>│</span>
        <span>{totalLinks} link{totalLinks !== 1 ? 's' : ''}</span>
        <span style={{ margin: '0 8px', color: 'var(--border-strong)' }}>│</span>
        <span style={{ color: isSimulating ? 'var(--status-ok)' : 'var(--text-muted)' }}>
          {isSimulating ? '● Simulating' : '○ Idle'}
        </span>
        {activeDrawTool && (
          <>
            <span style={{ margin: '0 8px', color: 'var(--border-strong)' }}>│</span>
            <span style={{ color: '#8B5CF6', fontFamily: 'Inter, system-ui, sans-serif' }}>
              {activeDrawTool === 'rectangle' && 'Rectangle — click & drag'}
              {activeDrawTool === 'ellipse'   && 'Ellipse — click & drag'}
              {activeDrawTool === 'line'      && 'Line — click & drag'}
              {activeDrawTool === 'text'      && 'Text — click to place'}
              {activeDrawTool === 'polygon'   && 'Polygon — click vertices, dbl-click to close'}
              {activeDrawTool === 'image'     && 'Image — click to insert'}
              {activeDrawTool === 'freeDraw'  && 'Free Draw — draw a shape and it will be auto-recognized (circle, rectangle, triangle, line)'}
            </span>
          </>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 9, fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text-muted)' }}>
          SCADA Designer v2
        </span>
      </div>

      {/* Modals */}
      {showBuildModal && (
        <BuildCustomNodeModal
          isDarkMode={isDarkMode}
          onClose={() => setShowBuildModal(false)}
          onCreate={({ name, template, color, unit }) => addNodeToGraph({ t: template, props: { name, color, unit } }, 200, 200)}
        />
      )}
      {showAddDevice && (
        <AddDeviceModal
          onClose={() => setShowAddDevice(false)}
          onAdd={newDev => setDevices(prev =>
            prev.map(cat => cat.category === newDev.category
              ? { ...cat, devices: [...cat.devices, newDev] }
              : cat)
          )}
        />
      )}
    </div>
  );
};
