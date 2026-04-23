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
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

import { SCADAContext }         from '../context/SCADAContext';
import { ReactWidgetOverlays }  from '../components/canvas/ReactWidgetOverlays';
import { SelectionOverlay }     from '../components/canvas/SelectionOverlay';
import Minimap                  from '../components/canvas/Minimap';
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
  makePortsConfig,
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
  const { tags, history, isSimulating, isDarkMode, devices, setDevices } = useContext(SCADAContext);

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
  // Phase 6 — Rubber-band multi-select
  const isRubberBandRef    = useRef(false);
  const rubberStartRef     = useRef({ x: 0, y: 0 });

  // ── State ─────────────────────────────────────────────────────────────────
  const [activeTab,             setActiveTab]             = useState('explorer');
  const [selectedCellId,        setSelectedCellId]        = useState(null);
  const [selectedCellIds,       setSelectedCellIds]       = useState([]);   // Phase 6
  const [gridVisible,           setGridVisible]           = useState(true);
  const [snapEnabled,           setSnapEnabled]           = useState(true);
  const [canvasBg,              setCanvasBg]              = useState(isDarkMode ? '#0B0F19' : '#EEF2F6');
  const [cellData,              setCellData]              = useState([]);
  const [showBuildModal,        setShowBuildModal]        = useState(false);
  const [showAddDevice,         setShowAddDevice]         = useState(false);
  const [collapsedCategories,   setCollapsedCategories]   = useState({});
  const [isPanMode,             setIsPanMode]             = useState(false);
  const [activeDrawTool,        setActiveDrawTool]        = useState(null);
  // Phase 5 — undo/redo availability flags (drive button disabled states)
  const [canUndo,               setCanUndo]               = useState(false);
  const [canRedo,               setCanRedo]               = useState(false);
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
  useEffect(() => { setCanvasBg(isDarkMode ? '#0B0F19' : '#EEF2F6'); }, [isDarkMode]);

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
  const bringToFront  = useCallback(() => selectedCell?.toFront(),   [selectedCell]);
  const bringForward  = useCallback(() => selectedCell?.toFront(),   [selectedCell]); // JointJS has no step-up
  const sendBackward  = useCallback(() => selectedCell?.toBack(),    [selectedCell]);
  const sendToBack    = useCallback(() => selectedCell?.toBack(),     [selectedCell]);

  // ── Phase 5+6: Keyboard shortcuts ────────────────────────────────────────
  useEditorKeyboard({
    historyRef,
    onCopy:      handleCopy,
    onPaste:     handlePaste,
    onDuplicate: handleDuplicate,
    onDelete:    handleDelete,
    onEscape:    handleEscape,
  });

  // ── Phase 3: Tag expression binding sync ─────────────────────────────────
  useEffect(() => {
    if (!graphRef.current) return;
    syncAllBindings(graphRef.current, tags);
  }, [tags]);

  // ── Cell data sync from graph ─────────────────────────────────────────────
  useEffect(() => {
    const graph = graphRef.current;
    const syncData = () => {
      const mapped = graph.getCells().map(c => {
        const d = c.toJSON();
        const isNode = ['standard.Rectangle','standard.Ellipse','standard.Path','standard.Image'].includes(d.type);
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

    const gridColor = isDarkMode ? '#1e2d40' : '#CBD5E1';

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
      setRubberRect({ x, y, w: 0, h: 0 });
      setIsRubberBandActive(true);
      setSelectedCellId(null);
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
        const sx = rubberStartRef.current.x, sy = rubberStartRef.current.y;
        setRubberRect({ x: sx, y: sy, w: x - sx, h: y - sy });
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
          setSelectedCellIds(selected.map(c => c.id));
          if (selected.length === 1) setSelectedCellId(selected[0].id);
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
    paper.on('cell:pointerup', (cellView) => {
      if (!isDrawingShapeRef.current) setSelectedCellId(cellView.model.id);
      // Show link tools if an existing link is selected (not a newly drawn one)
      if (cellView.model.isLink() && !isDrawingShapeRef.current) {
        showLinkTools(cellView);
      }
    });

    // ── Pan: mouse move / up on document ─────────────────────────────────
    const handlePanMove = (e) => {
      if (isPanningRef.current && paperRef.current) {
        paperRef.current.translate(e.clientX - panStartRef.current.x, e.clientY - panStartRef.current.y);
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

  // ── Zoom controls ─────────────────────────────────────────────────────────
  const zoomIn  = () => { if (paperRef.current) { const s = paperRef.current.scale(); paperRef.current.scale(Math.min(s.sx * 1.2, 4)); } };
  const zoomOut = () => { if (paperRef.current) { const s = paperRef.current.scale(); paperRef.current.scale(Math.max(s.sx / 1.2, 0.2)); } };
  const zoomFit = () => { paperRef.current?.scaleContentToFit({ padding: 40 }); };

  // ── Save / Load / Export ──────────────────────────────────────────────────
  const saveGraph = () => {
    localStorage.setItem('scada_graph_save', JSON.stringify(graphRef.current.toJSON()));
    alert('Layout saved to local storage!');
  };
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
      breaker_symbol: { w: 60, h: 90 }, disconnector_symbol: { w: 60, h: 90 }, ground_symbol: { w: 60, h: 70 },
      pipe_horz: { w: 150, h: 40 }, pipe_vert: { w: 40, h: 150 }, elbow_br: { w: 80, h: 80 },
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
        } else if (t === 'standard.Path')      { selectedCell.attr('body/stroke', value); }
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
      { t: 'tank_level',      l: 'Storage Silo',  i: ScadaIcons.Facility,   props: { name: 'Silo 01',       color: '#3B82F6', unit: '%' } },
      { t: 'motor_status',    l: 'Feed Pump',      i: ScadaIcons.Facility,   props: { name: 'Pump A',        color: '#3B82F6' } },
      { t: 'valve_control',   l: 'Ctrl Valve',     i: ScadaIcons.Facility,   props: { name: 'Valve',         color: '#EF4444', val: false } },
      { t: 'progress_bar',    l: 'Cap. Bar',        i: ScadaIcons.Progress,   props: { name: 'Capacity',      color: '#8b5cf6', unit: 'U' } },
      { t: 'scadavis_symbol', l: 'Facility',        i: ScadaIcons.Facility,   props: { name: 'Plant A',       color: '#64748b' } },
    ]},
    { cat: 'Piping & Routing', items: [
      { t: 'pipe_horz', l: 'Horz Pipe', i: ScadaIcons.Facility, props: { name: 'Pipe', color: '#3B82F6' } },
      { t: 'pipe_vert', l: 'Vert Pipe', i: ScadaIcons.Facility, props: { name: 'Pipe', color: '#3B82F6' } },
      { t: 'elbow_br',  l: 'Elbow',     i: ScadaIcons.Facility, props: { name: 'Elbow', color: '#3B82F6' } },
    ]},
    { cat: 'Electrical Substation', items: [
      { t: 'breaker_symbol',      l: 'Breaker',    i: ScadaIcons.Breaker,      props: { name: 'CB-01',  color: '#EF4444' } },
      { t: 'disconnector_symbol', l: 'Disconnect', i: ScadaIcons.Disconnector, props: { name: 'DS-01',  color: '#F59E0B' } },
      { t: 'ground_symbol',       l: 'Ground',     i: ScadaIcons.Ground,       props: { name: 'GND',    color: '#22C55E' } },
    ]},
    { cat: 'Controls & Displays', items: [
      { t: 'toggle_switch',   l: 'Switch',      i: ScadaIcons.Toggle,    props: { name: 'Switch',    val: false } },
      { t: 'value_control',   l: 'Adjuster',    i: ScadaIcons.Slider,    props: { name: 'Setpoint',  val: 0 } },
      { t: 'gauge_dial',      l: 'Analog Dial', i: ScadaIcons.Gauge,     props: { name: 'Pressure',  color: '#3B82F6', unit: 'PSI' } },
      { t: 'digital_readout', l: 'LCD Display', i: ScadaIcons.LCD,       props: { name: 'Live Data', color: '#10b981', unit: '' } },
      { t: 'temp_display',    l: 'Numeric',     i: ScadaIcons.Temp,      props: { name: 'Display',   color: '#3B82F6', unit: '°C' } },
    ]},
    { cat: 'Status & Alerts', items: [
      { t: 'status_led',    l: 'Status LED', i: ScadaIcons.LED,     props: { name: 'Indicator',     val: false, color: '#10b981' } },
      { t: 'battery_level', l: 'Battery',    i: ScadaIcons.Battery, props: { name: 'Bank',          val: 100 } },
      { t: 'alert_banner',  l: 'Warning',    i: ScadaIcons.Alert,   props: { name: 'System Warning', val: false } },
      { t: 'header_text',   l: 'Header',     i: ScadaIcons.Text,    props: { name: 'Area Label',    color: '#cbd5e1' } },
    ]},
    { cat: 'Analytics', items: [
      { t: 'line_chart', l: 'Trend View',  i: ScadaIcons.LineChart, props: { name: 'History', color: '#3B82F6' } },
      { t: 'bar_chart',  l: 'Volume Bar',  i: ScadaIcons.BarChart,  props: { name: 'Volume',  color: '#8b5cf6' } },
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

      <div className="flex-1 flex overflow-hidden">

        {/* Sidebar */}
        <EditorSidebar
          activeTab={activeTab}
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

          {/* Minimap */}
          {!isSimulating && <Minimap graph={graphRef.current} isDarkMode={isDarkMode} />}

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 z-40 flex flex-col gap-1">
            {[
              { icon: ZoomIn,    fn: zoomIn,  title: 'Zoom In'    },
              { icon: ZoomOut,   fn: zoomOut, title: 'Zoom Out'   },
              { icon: Maximize2, fn: zoomFit, title: 'Fit to View' },
            ].map(({ icon: Icon, fn, title }) => (
              <button
                key={title} onClick={fn} title={title}
                className="w-9 h-9 flex items-center justify-center rounded-lg shadow-lg transition-colors theme-transition"
                style={{ backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-panel)'}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
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
