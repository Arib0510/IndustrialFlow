import React, { useState, useRef, useContext, useEffect, useMemo, useCallback } from "react";
import * as joint from "jointjs";
import { v4 as uuidv4 } from "uuid";
import {
  Database, Link as LinkIcon, Edit3, Pointer, Trash, Settings, Trash2, Grid, Magnet,
  Activity, Zap, Thermometer, Droplets, Wind, Sun, Power, SlidersHorizontal, CircleDot,
  BarChart3, LineChart as LineChartIcon, Move, AlertTriangle, Gauge, ToggleRight, Hash,
  Cpu, Lightbulb, Fan, AirVent, Tv, Cylinder, AlignLeft, Type, Battery, Search,
  Undo2, Redo2, Scissors, Copy, ClipboardPaste, Save, FolderOpen, FileDown,
  ZoomIn, ZoomOut, Maximize2, Plus, Pencil, ChevronDown, ChevronRight,
  Layers, PlayCircle, StopCircle, Bot, Wrench, Hand
} from "lucide-react";

import { SCADAContext } from "../../context/SCADAContext";
import { CustomDropdown } from "../ui/CustomDropdown";
import { CustomColorPicker } from "../ui/CustomColorPicker";
import { ReactWidgetOverlays } from "./ReactWidgetOverlays";
import { ResizeOverlay } from "./ResizeOverlay";
import { ICON_MAP } from "../../constants/config";
import Minimap from "./Minimap";
import BuildCustomNodeModal from "../modals/BuildCustomNodeModal";
import AddDeviceModal from "../modals/AddDeviceModal";
import TagBadge from "../ui/TagBadge";

// Components extracted to separate files: Minimap, BuildCustomNodeModal, AddDeviceModal, TagBadge



// ─── Main Component ─────────────────────────────────────────────────────────
export const DesignerCanvas = () => {
  const { tags, history, isSimulating, isDarkMode, writeTag, addCustomTag, devices, setDevices } = useContext(SCADAContext);
  const canvasRef = useRef(null);
  const paperRef = useRef(null);
  const graphRef = useRef(new joint.dia.Graph());

  const [activeTab, setActiveTab] = useState("explorer");
  const [selectedCellId, setSelectedCellId] = useState(null);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [gridVisible, setGridVisible] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [canvasBg, setCanvasBg] = useState(isDarkMode ? '#0B0F19' : '#EEF2F6');
  const [cellData, setCellData] = useState([]);
  const [showBuildModal, setShowBuildModal] = useState(false);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [savedGraph, setSavedGraph] = useState(null);
  const [isPanMode, setIsPanMode] = useState(false);
  const isPanModeRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setCanvasBg(isDarkMode ? '#0B0F19' : '#EEF2F6');
  }, [isDarkMode]);

  useEffect(() => { isPanModeRef.current = isPanMode; }, [isPanMode]);

  const selectedCell = selectedCellId ? graphRef.current.getCell(selectedCellId) : null;

  // ── Total nodes & links ──────────────────────────────────────────────────
  const totalNodes = cellData.filter(c => c.isNode).length;
  const totalLinks = cellData.filter(c => c.isLink).length;

  // ── Initialize JointJS Paper ─────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    const graph = graphRef.current;

    const paperEl = document.createElement("div");
    paperEl.style.width = "100%";
    paperEl.style.height = "100%";
    canvasRef.current.appendChild(paperEl);

    const gridColor = isDarkMode ? '#1e2d40' : '#CBD5E1';
    const paper = new joint.dia.Paper({
      el: paperEl,
      model: graph,
      width: canvasRef.current.clientWidth,
      height: canvasRef.current.clientHeight,
      background: { color: 'transparent' },
      gridSize: gridVisible ? 20 : 1,
      drawGrid: gridVisible ? { name: 'dot', args: { color: gridColor, thickness: 1.5 } } : false,
      interactive: !isSimulating,
      defaultLink: () => new joint.shapes.standard.Link({
        attrs: {
          line: { stroke: isDarkMode ? '#3B82F6' : '#2563EB', strokeWidth: 2, targetMarker: { type: 'path', d: 'M 10 -5 0 0 10 5 z' } }
        }
      }),
      defaultRouter: { name: 'orthogonal', args: { padding: 10 } },
      defaultConnector: { name: 'rounded', args: { radius: 8 } },
      linkPinning: false,
      snapLinks: { radius: 20 },
      validateConnection: (cellViewS, magnetS, cellViewT, magnetT) => {
        if (cellViewS === cellViewT) return false;
        return magnetT ? (magnetT.getAttribute('magnet') !== 'false') : false;
      }
    });

    paper.on('blank:pointerdown', (evt) => {
      if (isPanModeRef.current) {
        isPanningRef.current = true;
        const { tx, ty } = paper.translate();
        panStartRef.current = { x: evt.clientX - tx, y: evt.clientY - ty };
        document.body.style.cursor = 'grabbing';
      } else {
        setSelectedCellId(null);
      }
    });
    paper.on('cell:pointerup', (cellView) => setSelectedCellId(cellView.model.id));
    paperRef.current = paper;

    const handlePanMove = (e) => {
      if (isPanningRef.current && paperRef.current) {
        const tx = e.clientX - panStartRef.current.x;
        const ty = e.clientY - panStartRef.current.y;
        paperRef.current.translate(tx, ty);
      }
    };
    const handlePanEnd = () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        document.body.style.cursor = '';
      }
    };
    document.addEventListener('mousemove', handlePanMove);
    document.addEventListener('mouseup', handlePanEnd);

    return () => {
      document.removeEventListener('mousemove', handlePanMove);
      document.removeEventListener('mouseup', handlePanEnd);
      paper.remove();
      paperRef.current = null;
    };
  }, [gridVisible, isSimulating, isDarkMode]);

  // ── Sync JointJS cell data ───────────────────────────────────────────────
  useEffect(() => {
    if (!graphRef.current) return;
    const graph = graphRef.current;
    const syncData = () => {
      const mapped = graph.getCells().map(c => {
        const d = c.toJSON();
        if (d.type === 'standard.Rectangle') {
          return { id: d.id, ...d.data, position: d.position, size: d.size, angle: d.angle || c.angle() || 0, isNode: true };
        }
        return { id: d.id, isLink: true, source: d.source, target: d.target, ...d.data };
      });
      setCellData(mapped);
    };
    graph.on('add remove change:position change:size change:angle change:source change:target change:data', syncData);
    return () => graph.off('add remove change:position change:size change:angle change:source change:target change:data', syncData);
  }, []);

  // ── Zoom controls ────────────────────────────────────────────────────────
  const zoomIn = () => { if (paperRef.current) { const s = paperRef.current.scale(); paperRef.current.scale(Math.min(s.sx * 1.2, 4)); } };
  const zoomOut = () => { if (paperRef.current) { const s = paperRef.current.scale(); paperRef.current.scale(Math.max(s.sx / 1.2, 0.2)); } };
  const zoomFit = () => { if (paperRef.current) { paperRef.current.scaleContentToFit({ padding: 40 }); } };

  // ── Save / Load / Export ─────────────────────────────────────────────────
  const saveGraph = () => {
    const json = JSON.stringify(graphRef.current.toJSON());
    setSavedGraph(json);
    localStorage.setItem('scada_graph_save', json);
    alert('Layout saved!');
  };
  const loadGraph = () => {
    const saved = localStorage.getItem('scada_graph_save');
    if (saved) { graphRef.current.fromJSON(JSON.parse(saved)); } else { alert('No saved layout found.'); }
  };
  const exportGraph = () => {
    const json = JSON.stringify(graphRef.current.toJSON(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'scada_layout.json'; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Clear canvas ─────────────────────────────────────────────────────────
  const resetCanvas = () => {
    if (window.confirm("Clear the entire canvas?")) { graphRef.current.clear(); setSelectedCellId(null); }
  };

  // ── Drop handler ─────────────────────────────────────────────────────────
  const onDrop = (e) => {
    e.preventDefault();
    if (isSimulating || !canvasRef.current) return;
    const rawData = e.dataTransfer.getData('application/scada');
    if (!rawData) return;
    const data = JSON.parse(rawData);
    if (!data.t) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    addNodeToGraph(data, x, y);
  };

  const addNodeToGraph = (data, x, y) => {
    const graph = graphRef.current;
    const defaultSizes = {
      'tagNode': { w: 180, h: 80 }, 'line_chart': { w: 400, h: 250 }, 'bar_chart': { w: 400, h: 250 },
      'tank_level': { w: 140, h: 200 }, 'battery_level': { w: 160, h: 120 }, 'gauge_dial': { w: 140, h: 140 },
      'valve_control': { w: 100, h: 100 }, 'progress_bar': { w: 220, h: 100 }, 'alert_banner': { w: 260, h: 80 },
      'status_led': { w: 120, h: 100 }, 'motor_status': { w: 120, h: 120 }, 'value_control': { w: 160, h: 100 },
      'digital_readout': { w: 140, h: 80 }, 'temp_display': { w: 140, h: 100 }, 'toggle_switch': { w: 160, h: 80 },
      'header_text': { w: 300, h: 50 },
    };
    const size = defaultSizes[data.t] || { w: 120, h: 80 };
    const portMarkup = [{ tagName: 'circle', selector: 'portBody', attributes: { r: 6, fill: '#3B82F6', stroke: '#ffffff', strokeWidth: 2, cursor: 'crosshair' } }];
    const element = new joint.shapes.standard.Rectangle({
      id: uuidv4(),
      position: { x, y },
      size: { width: size.w, height: size.h },
      attrs: { body: { fill: 'transparent', stroke: 'transparent', strokeWidth: 0, rx: 4, ry: 4 }, label: { text: '', fill: 'transparent' } },
      ports: {
        groups: {
          'top': { position: 'top', markup: portMarkup, attrs: { portBody: { magnet: true } } },
          'bottom': { position: 'bottom', markup: portMarkup, attrs: { portBody: { magnet: true } } },
          'left': { position: 'left', markup: portMarkup, attrs: { portBody: { magnet: true } } },
          'right': { position: 'right', markup: portMarkup, attrs: { portBody: { magnet: true } } }
        },
        items: [{ group: 'top' }, { group: 'bottom' }, { group: 'left' }, { group: 'right' }]
      },
      data: { ...data.props, category: data.t }
    });
    graph.addCell(element);
    setSelectedCellId(element.id);
  };

  // ── Build Custom Node Handler ────────────────────────────────────────────
  const handleCreateCustomNode = ({ name, template, color, unit }) => {
    addNodeToGraph({ t: template, props: { name, color, unit } }, 200, 200);
  };

  // ── Add Device Handler ───────────────────────────────────────────────────
  const handleAddDevice = (newDev) => {
    setDevices(prev => prev.map(cat =>
      cat.category === newDev.category
        ? { ...cat, devices: [...cat.devices, newDev] }
        : cat
    ));
  };

  // ── Inspector update helpers ─────────────────────────────────────────────
  const updateSelectedCell = (prop, value) => {
    if (!selectedCell) return;
    const data = selectedCell.get('data') || {};
    selectedCell.set('data', { ...data, [prop]: value });
  };
  const updateSelectedCellSize = (w, h) => { if (selectedCell && !selectedCell.isLink()) selectedCell.resize(w, h); };
  const deleteSelected = () => { if (selectedCell) { selectedCell.remove(); setSelectedCellId(null); } };

  // ── Tag grouping ─────────────────────────────────────────────────────────
  const groupedTags = useMemo(() => {
    const groups = {};
    Object.keys(tags).forEach(key => {
      if (key.includes('/')) {
        const prefix = key.split('/')[0];
        if (!groups[prefix]) groups[prefix] = [];
        if (key.toLowerCase().includes(tagSearchQuery.toLowerCase())) groups[prefix].push(key);
      }
    });
    return groups;
  }, [tags, tagSearchQuery]);

  const tagOptions = useMemo(() => Object.keys(tags).map(key => ({ label: key, value: key })), [tags]);

  // ── Toolbox definition ───────────────────────────────────────────────────
  const toolbox = [
    { cat: "Industrial Nodes", items: [
      { t: "tank_level", l: "Liquid Tank", i: Cylinder, props: { name: "New Tank", color: "#3B82F6", unit: "%" } },
      { t: "motor_status", l: "Motor/Fan", i: Fan, props: { name: "Exhaust Fan", color: "#f59e0b" } },
      { t: "valve_control", l: "Control Valve", i: ToggleRight, props: { name: "Main Valve", val: false } },
      { t: "progress_bar", l: "Progress Bar", i: AlignLeft, props: { name: "Progress", color: "#8b5cf6", unit: "U" } },
    ]},
    { cat: "Controls & Displays", items: [
      { t: "toggle_switch", l: "Toggle Switch", i: Power, props: { name: "Switch", val: false } },
      { t: "value_control", l: "Value Adjuster", i: SlidersHorizontal, props: { name: "Setpoint", val: 0 } },
      { t: "gauge_dial", l: "Analog Gauge", i: Gauge, props: { name: "Pressure", unit: "PSI" } },
      { t: "digital_readout", l: "LCD Display", i: Hash, props: { name: "Live Data", color: "#10b981", unit: "" } },
      { t: "temp_display", l: "Numeric Val", i: Thermometer, props: { name: "Display", color: "#3B82F6", unit: "°C" } }
    ]},
    { cat: "Status & Alerts", items: [
      { t: "status_led", l: "Status LED", i: CircleDot, props: { name: "Status Indicator", val: false, color: "#10b981" } },
      { t: "battery_level", l: "Battery Bank", i: Battery, props: { name: "Storage Bank", val: 100 } },
      { t: "alert_banner", l: "Alert Banner", i: AlertTriangle, props: { name: "System Warning", val: false } },
      { t: "header_text", l: "Header Text", i: Type, props: { name: "System Area", color: "#cbd5e1" } }
    ]},
    { cat: "Analytics", items: [
      { t: "line_chart", l: "Line Chart", i: LineChartIcon, props: { name: "Trend View", color: "#3B82F6" } },
      { t: "bar_chart", l: "Bar Chart", i: BarChart3, props: { name: "Volume Bar", color: "#8b5cf6" } }
    ]}
  ];

  // ── Shared style tokens ──────────────────────────────────────────────────
  const panelStyle = { backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' };
  const inputSt = { backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none', borderRadius: 6, padding: '6px 10px', fontSize: 11 };

  const toolbarBtn = (active, activeColor = 'var(--accent)') => ({
    padding: '6px 8px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
    fontSize: 11, fontWeight: 700, letterSpacing: 1,
    backgroundColor: active ? `rgba(59,130,246,0.15)` : 'transparent',
    color: active ? activeColor : 'var(--text-secondary)',
    border: 'none', outline: 'none', transition: 'all 0.15s',
  });

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col theme-transition" style={{ backgroundColor: 'var(--bg-main)' }}>
      
      {/* ── Sub-header / Tab Bar ──────────────────────────────────────────── */}
      <div className="flex shrink-0 theme-transition" style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border)' }}>
        
        {/* Left sidebar tabs */}
        {!isSimulating && (
          <div className="flex" style={{ width: 320, borderRight: '1px solid var(--border)' }}>
            <button
              onClick={() => setActiveTab('explorer')}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-widest transition-colors"
              style={activeTab === 'explorer'
                ? { backgroundColor: 'var(--bg-panel)', color: 'var(--accent)', borderBottom: `2px solid var(--accent)` }
                : { color: 'var(--text-secondary)', borderBottom: '2px solid transparent' }}
            >
              <Database size={13} /> Explorer
            </button>
            <button
              onClick={() => setActiveTab('nodes')}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-widest transition-colors"
              style={activeTab === 'nodes'
                ? { backgroundColor: 'var(--bg-panel)', color: 'var(--accent)', borderBottom: `2px solid var(--accent)` }
                : { color: 'var(--text-secondary)', borderBottom: '2px solid transparent' }}
            >
              <Layers size={13} /> Nodes
            </button>
          </div>
        )}

        {/* Canvas title + toolbar */}
        <div className="flex-1 flex items-center gap-1 px-3 py-2 overflow-x-auto">
          <span className="text-sm font-bold mr-4 shrink-0" style={{ color: 'var(--accent)' }}>
            Plant Layout Overview
          </span>

          {/* Undo/Redo/Cut/Copy/Paste */}
          <button style={toolbarBtn(false)} title="Undo"><Undo2 size={14} /></button>
          <button style={toolbarBtn(false)} title="Redo"><Redo2 size={14} /></button>
          <div className="w-px h-5 mx-1 shrink-0" style={{ backgroundColor: 'var(--border)' }} />
          <button style={toolbarBtn(false)} title="Cut"><Scissors size={14} /></button>
          <button style={toolbarBtn(false)} title="Copy"><Copy size={14} /></button>
          <button style={toolbarBtn(false)} title="Paste"><ClipboardPaste size={14} /></button>
          <button style={toolbarBtn(isPanMode, '#22C55E')} onClick={() => setIsPanMode(!isPanMode)} title="Pan Mode"><Hand size={14} /></button>
          <div className="w-px h-5 mx-1 shrink-0" style={{ backgroundColor: 'var(--border)' }} />

          {/* Grid & Snap */}
          <button style={toolbarBtn(gridVisible)} onClick={() => setGridVisible(!gridVisible)} title="Toggle Grid">
            <Grid size={14} />
          </button>
          <button style={toolbarBtn(snapEnabled, '#F59E0B')} onClick={() => setSnapEnabled(!snapEnabled)} title="Snap to Grid">
            <Magnet size={14} />
          </button>
          <div className="w-px h-5 mx-1 shrink-0" style={{ backgroundColor: 'var(--border)' }} />

          {/* Save/Load/Export */}
          <button style={toolbarBtn(false)} onClick={saveGraph} title="Save Layout" className="flex gap-1.5">
            <Save size={13} /><span className="text-[10px] font-bold uppercase" style={{ color: 'var(--status-ok)' }}>Save</span>
          </button>
          <button style={toolbarBtn(false)} onClick={loadGraph} title="Load Layout" className="flex gap-1.5">
            <FolderOpen size={13} /><span className="text-[10px] font-bold uppercase" style={{ color: 'var(--accent)' }}>Load</span>
          </button>
          <button style={toolbarBtn(false)} onClick={exportGraph} title="Export JSON" className="flex gap-1.5">
            <FileDown size={13} /><span className="text-[10px] font-bold uppercase" style={{ color: '#06B6D4' }}>Export</span>
          </button>

          <div className="w-px h-5 mx-1 shrink-0" style={{ backgroundColor: 'var(--border)' }} />
          <button style={{ ...toolbarBtn(false), color: '#EF4444' }} onClick={resetCanvas} title="Clear Canvas" className="flex gap-1.5">
            <Trash2 size={13} /><span className="text-[10px] font-bold uppercase">Clear</span>
          </button>
        </div>

        {/* Right panel label */}
        {!isSimulating && (
          <div className="flex items-center gap-2 px-4 shrink-0" style={{ width: 300, borderLeft: '1px solid var(--border)' }}>
            <Settings size={14} style={{ color: 'var(--accent)' }} />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Node Inspector</span>
          </div>
        )}
      </div>

      {/* ── Main 3-column layout ──────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT SIDEBAR ──────────────────────────────────────────────────── */}
        {!isSimulating && (
          <div className="overflow-y-auto custom-scrollbar shrink-0 flex flex-col min-h-0 theme-transition"
            style={{ width: 320, backgroundColor: 'var(--bg-panel)', borderRight: '1px solid var(--border)' }}>

            {/* EXPLORER TAB */}
            {activeTab === 'explorer' && (
              <div className="flex flex-col gap-0 p-0">
                {/* Actions row */}
                <div className="flex gap-2 p-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={() => setShowAddDevice(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
                    style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                  ><Plus size={12} /> Tag</button>
                  <button
                    onClick={() => setShowAddDevice(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
                    style={{ backgroundColor: 'rgba(37,99,235,0.15)', color: 'var(--accent)', border: '1px solid rgba(37,99,235,0.3)' }}
                  ><Plus size={12} /> Device</button>
                </div>

                {/* Device categories */}
                {devices.map((cat, i) => {
                  const isCollapsed = collapsedCategories[cat.category];
                  return (
                    <div key={i} className="border-b" style={{ borderColor: 'var(--border)' }}>
                      {/* Category header */}
                      <button
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-left"
                        onClick={() => setCollapsedCategories(p => ({ ...p, [cat.category]: !p[cat.category] }))}
                      >
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
                        <span className="text-[10px] font-bold uppercase tracking-widest flex-1" style={{ color: 'var(--text-secondary)' }}>{cat.category}</span>
                        {isCollapsed ? <ChevronRight size={12} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={12} style={{ color: 'var(--text-muted)' }} />}
                      </button>

                      {/* Device cards */}
                      {!isCollapsed && cat.devices.map(dev => {
                        const DevIcon = ICON_MAP[dev.iconKey] || Activity;
                        return (
                          <div key={dev.id} className="mx-3 mb-2 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                            {/* Device header */}
                            <div
                              draggable
                              onDragStart={e => e.dataTransfer.setData('application/scada', JSON.stringify({ t: 'tagNode', props: { name: dev.name } }))}
                              className="flex items-center gap-3 p-3 cursor-grab"
                              style={{ backgroundColor: 'var(--bg-subtle)' }}
                            >
                              <DevIcon size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{dev.name}</div>
                                {dev.location && <div className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>{dev.location}</div>}
                              </div>
                              <button className="p-1 rounded opacity-60 hover:opacity-100 shrink-0"><Pencil size={11} style={{ color: 'var(--text-secondary)' }} /></button>
                            </div>

                            {/* Device tags/props */}
                            {dev.props && dev.props.map((prop, pi) => (
                              <div
                                key={pi}
                                draggable
                                onDragStart={e => e.dataTransfer.setData('application/scada', JSON.stringify({ t: 'tagNode', props: { tagKey: prop.key, name: prop.name } }))}
                                className="flex items-center justify-between px-4 py-2 cursor-grab border-t"
                                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-panel)' }}
                              >
                                <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{prop.name}</span>
                                <TagBadge type={prop.type} />
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {/* Raw Tags section */}
                <div className="p-3 pb-8">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Raw Tags</span>
                  </div>
                  <div className="relative mb-3">
                    <Search size={12} className="absolute left-2.5 top-2.5" style={{ color: 'var(--text-muted)' }} />
                    <input type="text" placeholder="Filter..." value={tagSearchQuery} onChange={e => setTagSearchQuery(e.target.value)}
                      style={{ ...inputSt, paddingLeft: 28, width: '100%' }} />
                  </div>
                  {Object.entries(groupedTags).map(([prefix, keys]) => (
                    <div key={prefix} className="mb-2 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                      <div className="px-3 py-1.5" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{prefix}</span>
                      </div>
                      {keys.map(key => (
                        <div key={key} draggable
                          onDragStart={e => e.dataTransfer.setData('application/scada', JSON.stringify({ t: 'tagNode', props: { tagKey: key } }))}
                          className="flex items-center justify-between px-3 py-2 cursor-grab border-t"
                          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-panel)' }}>
                          <span className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{key.split('/')[1]}</span>
                          <TagBadge type={tags[key].type} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NODES TAB */}
            {activeTab === 'nodes' && (
              <div className="p-3 flex flex-col gap-4">
                {/* Build custom node button */}
                <button
                  onClick={() => setShowBuildModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors"
                  style={{ background: 'linear-gradient(135deg, var(--accent), #8B5CF6)', color: '#FFFFFF', border: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  <Wrench size={14} /> Build Custom Node
                </button>

                {/* Toolbox groups */}
                {toolbox.map(group => (
                  <div key={group.cat}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{group.cat}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {group.items.map(tool => {
                        const Icon = tool.i;
                        return (
                          <div
                            key={tool.t}
                            draggable
                            onDragStart={e => e.dataTransfer.setData('application/scada', JSON.stringify({ t: tool.t, props: tool.props }))}
                            className="flex flex-col items-center gap-2 p-3 rounded-xl border cursor-grab text-center transition-all hover:opacity-80"
                            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border)' }}
                          >
                            <Icon size={20} style={{ color: 'var(--text-secondary)' }} />
                            <span className="text-[9px] font-bold" style={{ color: 'var(--text-secondary)' }}>{tool.l}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CANVAS ───────────────────────────────────────────────────────── */}
        <div className="flex-1 relative flex flex-col transition-colors" style={{ backgroundColor: canvasBg, cursor: isPanMode ? 'grab' : 'default' }}
          onDrop={onDrop} onDragOver={e => e.preventDefault()}>
          <div ref={canvasRef} className="absolute inset-0 z-0 overflow-hidden" />

          {/* Widget overlays */}
          <ReactWidgetOverlays graph={graphRef.current} nodes={cellData.filter(c => c.isNode)} history={history} selectedCellId={selectedCellId} paperRef={paperRef} />

          {/* Minimap */}
          {!isSimulating && <Minimap graph={graphRef.current} isDarkMode={isDarkMode} />}

          {/* Zoom controls – bottom right */}
          <div className="absolute bottom-4 right-4 z-40 flex flex-col gap-1">
            {[
              { icon: ZoomIn, fn: zoomIn, title: 'Zoom In' },
              { icon: ZoomOut, fn: zoomOut, title: 'Zoom Out' },
              { icon: Maximize2, fn: zoomFit, title: 'Fit to View' },
            ].map(({ icon: Icon, fn, title }) => (
              <button key={title} onClick={fn} title={title}
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

        {/* ── RIGHT INSPECTOR ────────────────────────────────────────────── */}
        {!isSimulating && (
          <div className="overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4 shrink-0 theme-transition"
            style={{ width: 300, backgroundColor: 'var(--bg-panel)', borderLeft: '1px solid var(--border)' }}>

            {selectedCell && selectedCell.isLink() ? (
              <div className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>Link selected — no properties</div>
            ) : selectedCell ? (
              <div className="flex flex-col gap-4">
                {/* Tag Binding */}
                {selectedCell.get('data')?.category !== 'tagNode' && selectedCell.get('data')?.category !== 'header_text' && (
                  <div className="p-4 rounded-xl border border-l-4 theme-transition"
                    style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)', borderLeftColor: 'var(--accent)' }}>
                    <div className="text-[9px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                      <Database size={11} /> Tag Binding
                    </div>
                    <CustomDropdown value={selectedCell.get('data')?.boundTag || ""} options={tagOptions} onChange={v => updateSelectedCell('boundTag', v)} placeholder="-- Select Data Tag --" />
                  </div>
                )}
                {selectedCell.get('data')?.category === 'tagNode' && (
                  <div className="p-4 rounded-xl border border-l-4 theme-transition"
                    style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)', borderLeftColor: '#F59E0B' }}>
                    <div className="text-[9px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: '#F59E0B' }}>
                      <Database size={11} /> Data Source Hub
                    </div>
                    <CustomDropdown value={selectedCell.get('data')?.tagKey || ""} options={tagOptions} onChange={v => updateSelectedCell('tagKey', v)} placeholder="-- Select Tag --" />
                  </div>
                )}

                {/* Node Properties */}
                <div className="p-4 rounded-xl border theme-transition" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
                  <div className="text-[9px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>Node Properties</div>
                  <div className="flex flex-col gap-3">
                    <label className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Display Name</label>
                    <input value={selectedCell.get('data')?.name || ""} onChange={e => updateSelectedCell('name', e.target.value)} style={{ ...inputSt, width: '100%' }} placeholder="Name" />
                  </div>
                  {selectedCell.get('data')?.category !== 'header_text' && selectedCell.get('data')?.category !== 'tagNode' && (
                    <div className="mt-3">
                      <label className="text-[9px] font-mono uppercase mb-2 block" style={{ color: 'var(--text-secondary)' }}>Theme Color</label>
                      <CustomColorPicker value={selectedCell.get('data')?.color || "#3B82F6"} onChange={v => updateSelectedCell('color', v)} />
                    </div>
                  )}
                  {selectedCell.get('data')?.category !== 'header_text' && selectedCell.get('data')?.category !== 'tagNode' && selectedCell.get('data')?.category !== 'status_led' && selectedCell.get('data')?.category !== 'toggle_switch' && selectedCell.get('data')?.category !== 'value_control' && selectedCell.get('data')?.category !== 'alert_banner' && selectedCell.get('data')?.category !== 'motor_status' && (
                    <div className="mt-3">
                      <label className="text-[9px] font-mono uppercase mb-2 block" style={{ color: 'var(--text-secondary)' }}>Unit Symbol</label>
                      <input value={selectedCell.get('data')?.unit || ""} onChange={e => updateSelectedCell('unit', e.target.value)} style={{ ...inputSt, width: '100%' }} />
                    </div>
                  )}
                </div>

                {/* Geometry */}
                {!selectedCell.isLink() && (
                  <div className="p-4 rounded-xl border border-l-4 theme-transition"
                    style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)', borderLeftColor: '#8B5CF6' }}>
                    <div className="text-[9px] font-bold uppercase tracking-widest mb-3" style={{ color: '#8B5CF6' }}>Geometry & Transform</div>
                    <div className="flex gap-2 mb-3">
                      <div className="flex-1">
                        <label className="text-[9px] block mb-1" style={{ color: 'var(--text-secondary)' }}>Width</label>
                        <input type="number" min="10" value={selectedCell.get('size')?.width || 0}
                          onChange={e => updateSelectedCellSize(parseInt(e.target.value) || 120, selectedCell.get('size')?.height || 80)}
                          style={{ ...inputSt, width: '100%' }} />
                      </div>
                      <div className="flex-1">
                        <label className="text-[9px] block mb-1" style={{ color: 'var(--text-secondary)' }}>Height</label>
                        <input type="number" min="10" value={selectedCell.get('size')?.height || 0}
                          onChange={e => updateSelectedCellSize(selectedCell.get('size')?.width || 120, parseInt(e.target.value) || 80)}
                          style={{ ...inputSt, width: '100%' }} />
                      </div>
                    </div>
                    <label className="text-[9px] flex justify-between mb-1" style={{ color: 'var(--text-secondary)' }}>
                      <span>Rotation</span><span style={{ color: '#8B5CF6' }}>{selectedCell.angle() || 0}°</span>
                    </label>
                    <input type="range" min="0" max="359" value={selectedCell.angle() || 0} onChange={e => {
                      const val = parseInt(e.target.value) || 0;
                      selectedCell.rotate(val, true); selectedCell.set('angle', val);
                    }} className="w-full accent-violet-500" />
                  </div>
                )}

                <button onClick={deleteSelected}
                  className="w-full py-2.5 rounded-xl text-xs font-bold uppercase flex justify-center gap-2 transition-colors"
                  style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.25)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
                ><Trash size={13} /> Delete Node</button>
              </div>
            ) : (
              /* No selection — Canvas properties */
              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-xl border border-l-4 theme-transition"
                  style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)', borderLeftColor: 'var(--border-strong)' }}>
                  <div className="text-[9px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                    <Settings size={11} /> Canvas Properties
                  </div>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-[9px] font-mono uppercase mb-2 block" style={{ color: 'var(--text-secondary)' }}>Background Color</label>
                      <CustomColorPicker value={canvasBg} onChange={setCanvasBg} />
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex flex-col gap-2">
                  {[
                    { label: 'Total Nodes', value: totalNodes },
                    { label: 'Total Links', value: totalLinks },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between p-3 rounded-lg border theme-transition"
                      style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      <span className="text-lg font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Canvas controls guide */}
                <div className="p-4 rounded-xl border theme-transition" style={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Pointer size={14} style={{ color: 'var(--text-secondary)' }} />
                    <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Canvas Controls</span>
                  </div>
                  <ul className="flex flex-col gap-2.5">
                    {[
                      { icon: Move, label: 'Move Node', hint: 'Drag Center' },
                      { icon: Maximize2, label: 'Resize', hint: 'Drag Blue Handles' },
                      { icon: LinkIcon, label: 'Connect', hint: 'Drag Ports' },
                      { icon: Edit3, label: 'Select', hint: 'Click Node' },
                    ].map(({ icon: Icon, label, hint }) => (
                      <li key={label} className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <Icon size={12} /> {label}
                        </span>
                        <kbd className="px-2 py-1 rounded text-[9px] font-mono" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{hint}</kbd>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showBuildModal && (
        <BuildCustomNodeModal
          isDarkMode={isDarkMode}
          onClose={() => setShowBuildModal(false)}
          onCreate={handleCreateCustomNode}
        />
      )}
      {showAddDevice && (
        <AddDeviceModal
          onClose={() => setShowAddDevice(false)}
          onAdd={handleAddDevice}
        />
      )}
    </div>
  );
};
