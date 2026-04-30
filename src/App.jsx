/**
 * ============================================================================
 * ENTERPRISE SCADA & IOT DASHBOARD - MODULARIZED
 * Features: Diagram editor, real-time data visualization, device management
 * ============================================================================
 */

import React, { useState, useRef, useCallback, createContext, useContext, useEffect, useMemo } from "react";
import * as go from "gojs";
import { ReactDiagram, ReactOverview } from "gojs-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

import { 
  Settings, Database, Plus, Trash2, Link as LinkIcon, Layers,
  Activity, Zap, Battery, Thermometer, Droplets, Wind, Sun, Power, SlidersHorizontal, Palette,
  Video, DoorOpen, PersonStanding, Lock as LockIcon, CircleDot, ToggleLeft, BarChart3, LineChart as LineChartIcon,
  Unlock, Hand, Move, Edit3, Pointer, Trash, AlertTriangle, Gauge, ToggleRight, Hash, Maximize,
  Cpu, Lightbulb, Fan, AirVent, Tv, Blinds, CarFront, Bot, ChevronDown, Check, Save, FolderOpen, PlayCircle, StopCircle,
  Cylinder, AlignLeft, Compass, ZoomIn, ZoomOut, Focus, X, Wrench, Settings2, Code, Box, Type, Search, Undo2, Redo2, Grid, Magnet,
  Copy, Scissors, ClipboardPaste, Image as ImageIcon, Map
} from "lucide-react";

// ============================================================================
// 1. GLOBAL STATE & EXPANDED DEVICES
// ============================================================================
const INITIAL_TAGS = {
  "sys/master_power": { value: 1, type: "boolean" },
  "power/main_watts": { value: 1450, type: "number" },
  "power/solar_yield": { value: 3200, type: "number" },
  "power/ev_charge": { value: 45, type: "number" },
  "ac/power": { value: 1, type: "boolean" },
  "ac/temp": { value: 22, type: "number" },
  "sensor/live_temp": { value: 24.5, type: "number" },
  "sensor/humidity": { value: 45, type: "number" },
  "factory/tank_level": { value: 65, type: "number" },
  "factory/pump_active": { value: 1, type: "boolean" },
  "factory/exhaust_fan": { value: 1, type: "boolean" },
  "factory/main_valve": { value: 0, type: "boolean" },
  "factory/pressure": { value: 85, type: "number" },
  "security/front_door": { value: 0, type: "boolean" },
  "security/motion_pir": { value: 1, type: "boolean" },
  "weather/wind_dir": { value: 180, type: "number" },
  "system/status_msg": { value: "All Systems Nominal", type: "string" }
};

const INITIAL_DEVICES = [
  {
    category: "Industrial & Factory",
    devices: [
      { id: "dev_factory", name: "Pump Station", location: "Sector 4", iconKey: "Cylinder", props: [{ key: "factory/pump_active", name: "Pump Power", type: "boolean" }, { key: "factory/tank_level", name: "Tank Volume", type: "number", unit: "%" }] },
      { id: "dev_exhaust", name: "Ventilation", location: "Roof", iconKey: "Fan", props: [{ key: "factory/exhaust_fan", name: "Fan Power", type: "boolean" }] },
      { id: "dev_pipeline", name: "Main Pipeline", location: "Sector 1", iconKey: "ToggleRight", props: [{ key: "factory/main_valve", name: "Valve State", type: "boolean" }, { key: "factory/pressure", name: "PSI Level", type: "number", unit: "PSI" }] }
    ]
  },
  {
    category: "Energy & Power",
    devices: [
      { id: "dev_solar", name: "Solar Array", location: "Grid A", iconKey: "Sun", props: [{ key: "power/solar_yield", name: "Current Yield", type: "number", unit: "W" }] },
      { id: "dev_ev", name: "EV Charger", location: "Garage", iconKey: "Zap", props: [{ key: "power/ev_charge", name: "Charge Level", type: "number", unit: "%" }] }
    ]
  },
  {
    category: "Climate & Environment",
    devices: [
      { id: "dev_ac", name: "Master AC", location: "Zone 1", iconKey: "AirVent", props: [{ key: "ac/power", name: "AC Power", type: "boolean" }, { key: "ac/temp", name: "Target Temp", type: "number", unit: "°C" }] },
      { id: "dev_sensor", name: "Room Sensor", location: "Zone 1", iconKey: "Cpu", props: [{ key: "sensor/live_temp", name: "Live Temp", type: "number", unit: "°C" }, { key: "sensor/humidity", name: "Humidity", type: "number", unit: "%" }] },
    ]
  }
];

const ICON_MAP = { Activity, Zap, Thermometer, Droplets, Wind, Sun, Battery, Box, Layers, Cpu, Lightbulb, Fan, AirVent, Tv, Blinds, CarFront, Bot, Cylinder, Compass, Power, CircleDot, Type, SlidersHorizontal, LockIcon, AlertTriangle, Gauge, ToggleRight, Hash };

const SCADAContext = createContext(null);

// ============================================================================
// 2. GOJS DIAGRAM INITIALIZATION & TEMPLATES
// ============================================================================
function initDiagram() {
  const $ = go.GraphObject.make;

  const diagram = $(go.Diagram, {
    "undoManager.isEnabled": true,
    "animationManager.isEnabled": false,
    
    // Engineering Grid
    grid: $(go.Panel, "Grid",
      { name: "GRID", gridCellSize: new go.Size(20, 20) },
      $(go.Shape, "LineH", { stroke: "rgba(30, 41, 59, 0.4)", strokeWidth: 1 }),
      $(go.Shape, "LineV", { stroke: "rgba(30, 41, 59, 0.4)", strokeWidth: 1 })
    ),
    "draggingTool.isGridSnapEnabled": true,
    "resizingTool.isGridSnapEnabled": true,
    "draggingTool.gridSnapCellSize": new go.Size(20, 20),
    "resizingTool.cellSize": new go.Size(20, 20),

    model: $(go.GraphLinksModel, {
      linkKeyProperty: "key",
      linkFromPortIdProperty: "fromPort",
      linkToPortIdProperty: "toPort",
    }),
  });

  const customSelectionAdornment = $(go.Adornment, "Auto",
    $(go.Shape, "RoundedRectangle", { fill: null, stroke: "#0ea5e9", strokeWidth: 3, parameter1: 8 }),
    $(go.Placeholder)
  );

  const customResizeAdornment = $(go.Adornment, "Spot",
    $(go.Placeholder),
    $(go.Shape, "Rectangle", { alignment: go.Spot.TopLeft, cursor: "nwse-resize", desiredSize: new go.Size(8, 8), fill: "#0ea5e9", stroke: "#111827" }),
    $(go.Shape, "Rectangle", { alignment: go.Spot.Top, cursor: "n-resize", desiredSize: new go.Size(8, 8), fill: "#0ea5e9", stroke: "#111827" }),
    $(go.Shape, "Rectangle", { alignment: go.Spot.TopRight, cursor: "nesw-resize", desiredSize: new go.Size(8, 8), fill: "#0ea5e9", stroke: "#111827" }),
    $(go.Shape, "Rectangle", { alignment: go.Spot.Left, cursor: "w-resize", desiredSize: new go.Size(8, 8), fill: "#0ea5e9", stroke: "#111827" }),
    $(go.Shape, "Rectangle", { alignment: go.Spot.Right, cursor: "e-resize", desiredSize: new go.Size(8, 8), fill: "#0ea5e9", stroke: "#111827" }),
    $(go.Shape, "Rectangle", { alignment: go.Spot.BottomLeft, cursor: "sw-resize", desiredSize: new go.Size(8, 8), fill: "#0ea5e9", stroke: "#111827" }),
    $(go.Shape, "Rectangle", { alignment: go.Spot.Bottom, cursor: "s-resize", desiredSize: new go.Size(8, 8), fill: "#0ea5e9", stroke: "#111827" }),
    $(go.Shape, "Rectangle", { alignment: go.Spot.BottomRight, cursor: "se-resize", desiredSize: new go.Size(8, 8), fill: "#0ea5e9", stroke: "#111827" })
  );

  const customRotateAdornment = $(go.Adornment, "Spot",
    { locationSpot: go.Spot.Center },
    $(go.Shape, "Circle", { cursor: "pointer", desiredSize: new go.Size(12, 12), fill: "#f59e0b", stroke: "#111827", strokeWidth: 2 })
  );

  diagram.linkTemplate = $(go.Link,
    { routing: go.Link.Orthogonal, corner: 10, relinkableFrom: true, relinkableTo: true, resegmentable: true, selectionAdorned: true },
    $(go.Shape, { isPanelMain: true, stroke: "transparent", strokeWidth: 8 }), 
    $(go.Shape, { isPanelMain: true, strokeWidth: 3, stroke: "#6366f1" }, new go.Binding("stroke", "color"), new go.Binding("strokeDashArray", "animated", a => a ? [10, 10] : null)),
    $(go.Shape, { toArrow: "Standard", fill: "#6366f1", stroke: null }, new go.Binding("fill", "color"))
  );

  const makePort = (name, align, spot) => $(go.Shape, "Circle", {
    fill: "#6366f1", stroke: "#1e293b", strokeWidth: 2, desiredSize: new go.Size(12, 12),
    portId: name, alignment: align, fromSpot: spot, toSpot: spot,
    fromLinkable: true, toLinkable: true, cursor: "pointer"
  }, new go.Binding("visible", `port${name}`, v => v === true));

  const standardPorts = () => [
    makePort("LEFT", go.Spot.Left, go.Spot.Left),
    makePort("RIGHT", go.Spot.Right, go.Spot.Right),
    makePort("UP", go.Spot.Top, go.Spot.Top),
    makePort("DOWN", go.Spot.Bottom, go.Spot.Bottom)
  ];

  const widgetBase = { 
    selectionAdornmentTemplate: customSelectionAdornment, 
    resizeAdornmentTemplate: customResizeAdornment,
    rotateAdornmentTemplate: customRotateAdornment,
    locationSpot: go.Spot.Center,
    resizable: true,
    resizeObjectName: "BODY",
    rotatable: true
  };
  
  diagram.nodeTemplateMap.add("tagNode",
    $(go.Node, "Spot", widgetBase, 
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      new go.Binding("angle", "angle").makeTwoWay(),
      $(go.Panel, "Auto", { name: "BODY", width: 180, height: 80 },
        new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify),
        $(go.Shape, "RoundedRectangle", { fill: "#111827", stroke: "#0ea5e9", strokeWidth: 2, parameter1: 8 }),
        $(go.Panel, "Vertical", { alignment: go.Spot.Left, margin: 10 },
          $(go.TextBlock, { font: "bold 10px monospace", stroke: "#0ea5e9" }, new go.Binding("text", "tagKey")),
          $(go.TextBlock, { font: "bold 16px sans-serif", stroke: "#ffffff", margin: new go.Margin(4, 0, 0, 0) }, new go.Binding("text", "val", (v) => v !== undefined ? v.toString() : "N/A"))
        )
      ), ...standardPorts()
    )
  );

  diagram.nodeTemplateMap.add("line_chart",
    $(go.Node, "Spot", widgetBase, 
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      new go.Binding("angle", "angle").makeTwoWay(),
      $(go.Panel, "Auto", { name: "BODY", width: 400, height: 250 },
        new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify),
        $(go.Shape, "RoundedRectangle", { fill: "transparent", stroke: "#1e293b", strokeWidth: 2, parameter1: 8 })
      ), ...standardPorts()
    )
  );

  diagram.nodeTemplateMap.add("bar_chart",
    $(go.Node, "Spot", widgetBase, 
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      new go.Binding("angle", "angle").makeTwoWay(),
      $(go.Panel, "Auto", { name: "BODY", width: 400, height: 250 },
        new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify),
        $(go.Shape, "RoundedRectangle", { fill: "transparent", stroke: "#1e293b", strokeWidth: 2, parameter1: 8 })
      ), ...standardPorts()
    )
  );

  diagram.nodeTemplateMap.add("tank_level",
    $(go.Node, "Spot", widgetBase, 
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      new go.Binding("angle", "angle").makeTwoWay(),
      $(go.Panel, "Auto", { name: "BODY", width: 140, height: 200 },
        new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify),
        $(go.Shape, "RoundedRectangle", { fill: "#0f172a", stroke: "#1e293b", strokeWidth: 2, parameter1: 8 }),
        $(go.Panel, "Vertical",
          $(go.TextBlock, { font: "bold 12px sans-serif", stroke: "#94a3b8", margin: 8 }, new go.Binding("text", "name")),
          $(go.Panel, "Auto", { width: 60, height: 120, margin: 4 },
            $(go.Shape, "Rectangle", { fill: "#1e293b", stroke: "#334155", strokeWidth: 2 }),
            $(go.Shape, "Rectangle", { fill: "#3b82f6", strokeWidth: 0, alignment: go.Spot.Bottom }, new go.Binding("height", "val", (v) => Math.max(0, Math.min(100, v || 0)) / 100 * 116), new go.Binding("fill", "color"))
          ),
          $(go.TextBlock, { font: "bold 14px monospace", stroke: "#ffffff", margin: 4 }, new go.Binding("text", "", (d) => `${d.val !== undefined ? Number(d.val).toFixed(1) : 0} ${d.unit || '%'}`))
        )
      ), ...standardPorts()
    )
  );

  diagram.nodeTemplateMap.add("battery_level",
    $(go.Node, "Spot", widgetBase, 
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      new go.Binding("angle", "angle").makeTwoWay(),
      $(go.Panel, "Auto", { name: "BODY", width: 160, height: 120 },
        new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify),
        $(go.Shape, "RoundedRectangle", { fill: "#0f172a", stroke: "#1e293b", strokeWidth: 2, parameter1: 8 }),
        $(go.Panel, "Vertical", { alignment: go.Spot.Center, margin: 12 },
          $(go.TextBlock, { font: "bold 12px sans-serif", stroke: "#94a3b8", margin: new go.Margin(0,0,8,0) }, new go.Binding("text", "name")),
          $(go.Panel, "Auto", { width: 100, height: 36 },
            $(go.Shape, "RoundedRectangle", { fill: "#1e293b", stroke: "#475569", strokeWidth: 2, parameter1: 4 }),
            $(go.Shape, "RoundedRectangle", { fill: "#10b981", strokeWidth: 0, alignment: go.Spot.Left, margin: 3, parameter1: 2 },
              new go.Binding("width", "val", (v) => Math.max(0, Math.min(100, v || 0)) / 100 * 94),
              new go.Binding("fill", "val", (v) => v > 20 ? (v > 50 ? "#10b981" : "#f59e0b") : "#ef4444")
            )
          ),
          $(go.TextBlock, { font: "bold 16px monospace", stroke: "#ffffff", margin: new go.Margin(8,0,0,0) }, new go.Binding("text", "", (d) => `${d.val !== undefined ? Number(d.val).toFixed(0) : 0} %`))
        )
      ), ...standardPorts()
    )
  );

  diagram.nodeTemplateMap.add("gauge_dial",
    $(go.Node, "Spot", widgetBase, 
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      new go.Binding("angle", "angle").makeTwoWay(),
      $(go.Panel, "Auto", { name: "BODY", width: 140, height: 140 },
        new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify),
        $(go.Shape, "RoundedRectangle", { fill: "#0f172a", stroke: "#1e293b", strokeWidth: 2, parameter1: 8 }),
        $(go.Panel, "Spot",
          $(go.TextBlock, { font: "bold 10px sans-serif", stroke: "#94a3b8", alignment: new go.Spot(0.5, 0.15) }, new go.Binding("text", "name")),
          $(go.Shape, "Circle", { width: 70, height: 70, fill: "transparent", stroke: "#1e293b", strokeWidth: 8 }),
          $(go.Shape, "LineV", { width: 0, height: 35, stroke: "#ef4444", strokeWidth: 3, alignment: go.Spot.Center, alignmentFocus: go.Spot.Bottom },
            new go.Binding("angle", "val", v => (Math.max(0, Math.min(100, v||0)) / 100) * 270 - 135)
          ),
          $(go.Shape, "Circle", { width: 10, height: 10, fill: "#cbd5e1", stroke: null }),
          $(go.TextBlock, { font: "bold 12px monospace", stroke: "#ffffff", alignment: new go.Spot(0.5, 0.85) },
            new go.Binding("text", "", d => `${d.val !== undefined ? Number(d.val).toFixed(0) : 0} ${d.unit||''}`))
        )
      ), ...standardPorts()
    )
  );

  diagram.nodeTemplateMap.add("valve_control",
    $(go.Node, "Spot", widgetBase, 
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      new go.Binding("angle", "angle").makeTwoWay(),
      $(go.Panel, "Auto", { name: "BODY", width: 100, height: 100 },
        new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify),
        $(go.Shape, "RoundedRectangle", { fill: "#0f172a", stroke: "#1e293b", strokeWidth: 2, parameter1: 8 }),
        $(go.Panel, "Vertical", { alignment: go.Spot.Center },
          $(go.TextBlock, { font: "bold 10px sans-serif", stroke: "#94a3b8", margin: 4 }, new go.Binding("text", "name")),
          $(go.Shape, { 
              geometryString: "M0 0 L40 30 L0 30 L40 0 Z",
              width: 40, height: 30, strokeWidth: 2, isActionable: true, cursor: "pointer",
              click: (e, obj) => { const n = obj.part; if (n.diagram && n.diagram.handleNodeClick) n.diagram.handleNodeClick(n.data.boundTag, !n.data.val); }
            },
            new go.Binding("fill", "val", v => v ? "#10b981" : "#ef4444"),
            new go.Binding("stroke", "val", v => v ? "#059669" : "#b91c1c")
          ),
          $(go.TextBlock, { font: "bold 10px sans-serif", margin: 4 }, new go.Binding("text", "val", v => v ? "OPEN" : "CLOSED"), new go.Binding("stroke", "val", v => v ? "#10b981" : "#ef4444"))
        )
      ), 
      ...standardPorts()
    )
  );

  diagram.nodeTemplateMap.add("progress_bar",
    $(go.Node, "Spot", widgetBase, 
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      new go.Binding("angle", "angle").makeTwoWay(),
      $(go.Panel, "Auto", { name: "BODY", width: 220, height: 100 },
        new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify),
        $(go.Shape, "RoundedRectangle", { fill: "#0f172a", stroke: "#1e293b", strokeWidth: 2, parameter1: 8 }),
        $(go.Panel, "Vertical", { alignment: go.Spot.Left, margin: 12 },
          $(go.TextBlock, { font: "bold 12px sans-serif", stroke: "#94a3b8", margin: new go.Margin(0,0,8,0) }, new go.Binding("text", "name")),
          $(go.Panel, "Auto", { width: 190, height: 16 },
            $(go.Shape, "RoundedRectangle", { fill: "#1e293b", stroke: null, parameter1: 8 }),
            $(go.Shape, "RoundedRectangle", { fill: "#8b5cf6", stroke: null, parameter1: 8, alignment: go.Spot.Left }, new go.Binding("width", "val", (v) => Math.max(0, Math.min(100, v || 0)) / 100 * 190), new go.Binding("fill", "color"))
          ),
          $(go.TextBlock, { font: "bold 14px monospace", stroke: "#ffffff", margin: new go.Margin(8,0,0,0) }, new go.Binding("text", "", (d) => `${d.val !== undefined ? Number(d.val).toFixed(1) : 0} ${d.unit || ''}`))
        )
      ), ...standardPorts()
    )
  );

  diagram.nodeTemplateMap.add("alert_banner",
    $(go.Node, "Spot", widgetBase, 
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      new go.Binding("angle", "angle").makeTwoWay(),
      $(go.Panel, "Auto", { name: "BODY", width: 260, height: 60 },
        new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify),
        $(go.Shape, "RoundedRectangle", { fill: "#0f172a", strokeWidth: 2, parameter1: 8 }, new go.Binding("stroke", "val", v => v ? "#ef4444" : "#1e293b")),
        $(go.Panel, "Horizontal", { alignment: go.Spot.Left, margin: 10 },
          $(go.Shape, "Triangle", { width: 20, height: 20, fill: "transparent", strokeWidth: 2, margin: new go.Margin(0,10,0,0) }, new go.Binding("stroke", "val", v => v ? "#ef4444" : "#94a3b8")),
          $(go.Panel, "Vertical", { alignment: go.Spot.Left },
             $(go.TextBlock, { font: "bold 10px sans-serif", stroke: "#94a3b8" }, new go.Binding("text", "name")),
             $(go.TextBlock, { font: "bold 14px sans-serif" }, new go.Binding("text", "val", v => v ? "ALERT ACTIVE" : "SYSTEM NORMAL"), new go.Binding("stroke", "val", v => v ? "#ef4444" : "#10b981"))
          )
        )
      ), ...standardPorts()
    )
  );

  diagram.nodeTemplateMap.add("status_led",
    $(go.Node, "Spot", widgetBase, 
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      new go.Binding("angle", "angle").makeTwoWay(),
      $(go.Panel, "Auto", { name: "BODY", width: 120, height: 100 },
        new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify),
        $(go.Shape, "RoundedRectangle", { fill: "#0f172a", stroke: "#1e293b", strokeWidth: 2, parameter1: 8 }),
        $(go.Panel, "Vertical", { alignment: go.Spot.Center, margin: 8 },
          $(go.TextBlock, { font: "bold 10px sans-serif", stroke: "#94a3b8", margin: new go.Margin(0,0,8,0) }, new go.Binding("text", "name")),
          $(go.Shape, "Circle", { width: 32, height: 32, strokeWidth: 2 }, new go.Binding("fill", "", (data) => data.val ? (data.color || "#10b981") : "#1e293b"), new go.Binding("stroke", "", (data) => data.val ? (data.color || "#10b981") : "#334155"))
        )
      ), ...standardPorts()
    )
  );

  diagram.nodeTemplateMap.add("motor_status",
    $(go.Node, "Spot", widgetBase, 
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      new go.Binding("angle", "angle").makeTwoWay(),
      $(go.Panel, "Auto", { name: "BODY", width: 120, height: 120 },
        new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify),
        $(go.Shape, "RoundedRectangle", { fill: "#0f172a", stroke: "#1e293b", strokeWidth: 2, parameter1: 8 }),
        $(go.Panel, "Vertical", { alignment: go.Spot.Center, margin: 8 },
          $(go.TextBlock, { font: "bold 12px sans-serif", stroke: "#94a3b8", margin: new go.Margin(0,0,8,0) }, new go.Binding("text", "name")),
          $(go.Panel, "Spot",
            $(go.Shape, "Circle", { width: 40, height: 40, fill: "transparent", stroke: "#334155", strokeWidth: 2 }),
            $(go.Shape, { name: "FAN_ICON", width: 24, height: 24, strokeWidth: 3, fill: "transparent", geometryString: "M12 0 L12 24 M0 12 L24 12 M4 4 L20 20 M4 20 L20 4" }, new go.Binding("stroke", "color"))
          ),
          $(go.TextBlock, { font: "bold 10px sans-serif", margin: new go.Margin(8,0,0,0) }, new go.Binding("text", "val", v => v ? "RUNNING" : "STOPPED"), new go.Binding("stroke", "val", v => v ? "#10b981" : "#94a3b8"))
        )
      ), ...standardPorts()
    )
  );

  diagram.nodeTemplateMap.add("value_control",
    $(go.Node, "Spot", widgetBase, 
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      new go.Binding("angle", "angle").makeTwoWay(),
      $(go.Panel, "Auto", { name: "BODY", width: 160, height: 100 },
        new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify),
        $(go.Shape, "RoundedRectangle", { fill: "#0f172a", stroke: "#1e293b", strokeWidth: 2, parameter1: 8 }),
        $(go.Panel, "Vertical", { alignment: go.Spot.Center, margin: 8 },
          $(go.TextBlock, { font: "bold 12px sans-serif", stroke: "#94a3b8", margin: new go.Margin(0,0,8,0) }, new go.Binding("text", "name")),
          $(go.Panel, "Horizontal",
            $("Button", { click: (e, obj) => { const n = obj.part; if(n.diagram.handleNodeClick) n.diagram.handleNodeClick(n.data.boundTag, Number(n.data.val)-1); } }, $(go.TextBlock, "-", { font: "bold 16px sans-serif", stroke: "#1e293b", margin: 4 })),
            $(go.TextBlock, { font: "bold 20px monospace", stroke: "#38bdf8", width: 50, textAlign: "center" }, new go.Binding("text", "", d => `${d.val !== undefined ? Number(d.val).toFixed(0) : 0}`)),
            $("Button", { click: (e, obj) => { const n = obj.part; if(n.diagram.handleNodeClick) n.diagram.handleNodeClick(n.data.boundTag, Number(n.data.val)+1); } }, $(go.TextBlock, "+", { font: "bold 16px sans-serif", stroke: "#1e293b", margin: 4 }))
          )
        )
      ), ...standardPorts()
    )
  );

  diagram.nodeTemplateMap.add("digital_readout",
    $(go.Node, "Spot", widgetBase, 
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      new go.Binding("angle", "angle").makeTwoWay(),
      $(go.Panel, "Auto", { name: "BODY", width: 140, height: 80 },
        new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify),
        $(go.Shape, "RoundedRectangle", { fill: "#020617", stroke: "#1e293b", strokeWidth: 2, parameter1: 4 }),
        $(go.Panel, "Vertical", { alignment: go.Spot.Center },
          $(go.TextBlock, { font: "bold 10px sans-serif", stroke: "#64748b", margin: new go.Margin(0,0,4,0) }, new go.Binding("text", "name")),
          $(go.TextBlock, { font: "bold 26px monospace", stroke: "#10b981" }, new go.Binding("text", "", (d) => `${d.val !== undefined ? Number(d.val).toFixed(1) : 0} ${d.unit || ''}`), new go.Binding("stroke", "color"))
        )
      ), ...standardPorts()
    )
  );

  diagram.nodeTemplateMap.add("header_text",
    $(go.Node, "Spot", widgetBase, 
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      new go.Binding("angle", "angle").makeTwoWay(),
      $(go.Panel, "Auto", { name: "BODY", width: 300, height: 50 },
        new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify),
        $(go.Shape, "Rectangle", { fill: "transparent", stroke: null }),
        $(go.TextBlock, { font: "lighter 24px sans-serif", stroke: "#cbd5e1", alignment: go.Spot.Left }, new go.Binding("text", "name"), new go.Binding("stroke", "color"))
      )
    )
  );

  diagram.nodeTemplateMap.add("temp_display",
    $(go.Node, "Spot", widgetBase, 
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      new go.Binding("angle", "angle").makeTwoWay(),
      $(go.Panel, "Auto", { name: "BODY", width: 140, height: 100 },
        new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify),
        $(go.Shape, "RoundedRectangle", { fill: "#0f172a", stroke: "#1e293b", strokeWidth: 2, parameter1: 8 }),
        $(go.Panel, "Vertical", { alignment: go.Spot.Center },
          $(go.TextBlock, { font: "bold 12px sans-serif", stroke: "#94a3b8", margin: new go.Margin(0,0,8,0) }, new go.Binding("text", "name")),
          $(go.TextBlock, { font: "bold 24px sans-serif", stroke: "#ffffff" }, new go.Binding("text", "", (d) => {
            if(typeof d.val === 'string') return d.val;
            return `${d.val !== undefined ? Number(d.val).toFixed(1) : 0} ${d.unit || ''}`;
          }), new go.Binding("stroke", "color"))
        )
      ), ...standardPorts()
    )
  );

  diagram.nodeTemplateMap.add("toggle_switch",
    $(go.Node, "Spot", widgetBase, 
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      new go.Binding("angle", "angle").makeTwoWay(),
      $(go.Panel, "Auto", { name: "BODY", width: 160, height: 80 },
        new go.Binding("desiredSize", "size", go.Size.parse).makeTwoWay(go.Size.stringify),
        $(go.Shape, "RoundedRectangle", { fill: "#0f172a", stroke: "#1e293b", strokeWidth: 2, parameter1: 8 }),
        $(go.Panel, "Horizontal", { alignment: go.Spot.Center, margin: 10 },
          $(go.TextBlock, { font: "bold 12px sans-serif", margin: new go.Margin(0,10,0,0) }, new go.Binding("text", "val", (v) => v ? "ON" : "OFF"), new go.Binding("stroke", "val", (v) => v ? "#10b981" : "#94a3b8")),
          $(go.Panel, "Auto", { 
              width: 50, height: 26, isActionable: true, cursor: "pointer",
              click: (e, obj) => { const node = obj.part; if (node.diagram && node.diagram.handleNodeClick) node.diagram.handleNodeClick(node.data.boundTag, !node.data.val); }
            },
            $(go.Shape, "RoundedRectangle", { parameter1: 13, strokeWidth: 1, stroke: "#334155" }, new go.Binding("fill", "val", (v) => v ? "#10b981" : "#1e293b")),
            $(go.Shape, "Circle", { width: 18, height: 18, fill: "#ffffff", stroke: null }, new go.Binding("alignment", "val", (v) => v ? go.Spot.Right : go.Spot.Left), new go.Binding("margin", "val", (v) => v ? new go.Margin(0,4,0,0) : new go.Margin(0,0,0,4)))
          )
        )
      ), ...standardPorts()
    )
  );

  return diagram;
}

// ============================================================================
// 3. UI COMPONENTS
// ============================================================================
const CustomDropdown = ({ value, options, onChange, placeholder = "Select..." }) => {
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
      <div onClick={() => setIsOpen(!isOpen)} className="w-full p-2.5 bg-slate-950 border border-slate-700 hover:border-slate-500 rounded-lg text-[11px] text-slate-300 font-mono shadow-inner cursor-pointer flex justify-between items-center transition-colors">
        <span className="truncate">{selectedOpt ? selectedOpt.label : placeholder}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#0ea5e9]' : 'text-slate-500'}`} />
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-[#111827] border border-slate-700 rounded-lg shadow-2xl z-[9999] max-h-48 overflow-y-auto custom-scrollbar">
          <div onClick={() => { onChange(""); setIsOpen(false); }} className={`p-2.5 text-[11px] font-mono cursor-pointer transition-colors ${value === "" ? 'bg-[#0ea5e9]/20 text-[#0ea5e9]' : 'text-slate-400 hover:bg-[#1f2937]'}`}>-- None --</div>
          {options.map((opt) => (
            <div key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }} className={`p-2.5 text-[11px] font-mono cursor-pointer flex justify-between items-center transition-colors ${value === opt.value ? 'bg-[#0ea5e9]/20 text-[#0ea5e9] border-l-2 border-[#0ea5e9]' : 'text-slate-300 hover:bg-[#1f2937]'}`}>
              <span className="truncate">{opt.label}</span>
              {value === opt.value && <Check size={12} className="text-[#0ea5e9] shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CustomColorPicker = ({ value, onChange }) => {
  const PRESET_COLORS = ["#3b82f6", "#0ea5e9", "#10b981", "#eab308", "#f59e0b", "#ef4444", "#8b5cf6", "#cbd5e1"];
  return (
    <div className="flex flex-col gap-2 p-2 bg-[#111827] border border-slate-800 rounded-lg shadow-inner">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md shadow-sm border border-slate-700" style={{ backgroundColor: value }}></div>
        <input type="text" value={value || ""} onChange={(e) => onChange(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-xs font-mono text-slate-300 uppercase"/>
      </div>
      <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-800">
        {PRESET_COLORS.map(c => (
          <div key={c} onClick={() => onChange(c)} className={`w-full h-5 rounded cursor-pointer transition-transform hover:scale-110 ${value === c ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-950' : ''}`} style={{ backgroundColor: c }}/>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 4. MAIN CANVAS AND IDE WRAPPER
// ============================================================================
const ChartOverlays = ({ diagram, nodes, history }) => {
  const [boundsMap, setBoundsMap] = useState({});

  useEffect(() => {
    if (!diagram) return;
    
    const updateBounds = () => {
       const newMap = {};
       nodes.filter(n => n.category === 'line_chart' || n.category === 'bar_chart').forEach(nodeData => {
          const node = diagram.findNodeForKey(nodeData.key);
          if (node) {
             const docBounds = node.getDocumentBounds();
             docBounds.inflate(-4, -4); // fit perfectly inside standard shape borders
             const viewRaw = diagram.transformDocToView(docBounds.position);
             const viewWidth = docBounds.width * diagram.scale;
             const viewHeight = docBounds.height * diagram.scale;
             
             newMap[nodeData.key] = {
               left: viewRaw.x, top: viewRaw.y, width: viewWidth, height: viewHeight, scale: diagram.scale,
               data: nodeData
             };
          }
       });
       setBoundsMap(newMap);
    };

    diagram.addDiagramListener("ViewportBoundsChanged", updateBounds);
    updateBounds(); // initial
    
    // In complex UI setups like react-grid-layout or custom transitions, a fallback interval captures reflow misfires:
    const ival = setInterval(updateBounds, 100);

    return () => {
      diagram.removeDiagramListener("ViewportBoundsChanged", updateBounds);
      clearInterval(ival);
    };
  }, [diagram, nodes, history]);

  return (
    <div className="absolute inset-0 z-[5] pointer-events-none overflow-hidden">
      {Object.values(boundsMap).map(b => {
         const { left, top, width, height, scale, data } = b;
         if (!data.boundTag) {
           return (
             <div key={data.key} style={{ position: 'absolute', left, top, width, height }} className="pointer-events-auto bg-[#0b0f19] rounded shadow-inner flex flex-col items-center justify-center border border-dashed border-slate-700">
               <span className="text-slate-500 font-bold uppercase tracking-widest" style={{ fontSize: `${Math.max(8, 12*scale)}px` }}>UNBOUND CHART</span>
             </div>
           );
         }
         
         return (
           <div key={data.key} style={{ position: 'absolute', left, top, width, height }} className="pointer-events-auto bg-[#0b0f19] rounded shadow-inner flex flex-col p-2">
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2 mb-1 truncate" style={{ fontSize: `${Math.max(6, 10*scale)}px` }}>{data.name} </div>
             <div className="flex-1 min-h-0 w-full overflow-hidden">
               <ResponsiveContainer width="100%" height="100%">
                 {data.category === 'line_chart' ? (
                   <LineChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                     <XAxis dataKey="time" hide={true} />
                     <YAxis stroke="#475569" tick={{ fontSize: Math.max(8, 10*scale), fill: "#94a3b8" }} domain={['auto', 'auto']} />
                     <Tooltip contentStyle={{ backgroundColor: "#111827", borderColor: "#1e293b", fontSize: '10px' }} itemStyle={{ color: data.color || "#0ea5e9" }} />
                     <Line type="monotone" dataKey={data.boundTag} stroke={data.color || "#0ea5e9"} strokeWidth={Math.max(1, 2*scale)} dot={false} isAnimationActive={false} />
                   </LineChart>
                 ) : (
                   <BarChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                     <XAxis dataKey="time" hide={true} />
                     <YAxis stroke="#475569" tick={{ fontSize: Math.max(8, 10*scale), fill: "#94a3b8" }} domain={[0, 'auto']} />
                     <Tooltip contentStyle={{ backgroundColor: "#111827", borderColor: "#1e293b", fontSize: '10px' }} itemStyle={{ color: data.color || "#8b5cf6" }} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                     <Bar dataKey={data.boundTag} fill={data.color || "#8b5cf6"} isAnimationActive={false} />
                   </BarChart>
                 )}
               </ResponsiveContainer>
             </div>
           </div>
         );
      })}
    </div>
  );
};

const DesignerCanvas = () => {
  const { tags, history, isSimulating, writeTag, addCustomTag, devices, setDevices } = useContext(SCADAContext);
  const diagramRef = useRef(null);

  const [activeTab, setActiveTab] = useState("devices");
  const [selectedNodeKey, setSelectedNodeKey] = useState(null);
  const [selectedEdgeKey, setSelectedEdgeKey] = useState(null);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  
  // Canvas Settings State
  const [gridVisible, setGridVisible] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [canvasBg, setCanvasBg] = useState('#0b0f19');
  
  const [diagramInstance, setDiagramInstance] = useState(null);

  const [showTagModal, setShowTagModal] = useState(false);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  
  const [newTag, setNewTag] = useState({ key: "custom/sensor1", type: "number", value: 0 });
  const [newWidget, setNewWidget] = useState({ name: "Custom Sensor", template: "temp_display", color: "#0ea5e9", unit: "U" });
  const [editingDevice, setEditingDevice] = useState(null);
  const [customWidgets, setCustomWidgets] = useState([]);

  const defaultNodes = [
    { key: "hdr", category: "header_text", name: "Plant Layout Overview", color: "#cbd5e1", loc: "240 40" },
    { key: "tag1", category: "tagNode", tagKey: "factory/tank_level", val: 65, loc: "40 180", portRIGHT: true },
    { key: "tank1", category: "tank_level", name: "Main Vat", boundTag: "factory/tank_level", color: "#0ea5e9", unit: "%", val: 65, loc: "320 180", portLEFT: true },
    { key: "tag2", category: "tagNode", tagKey: "sys/master_power", val: 1, loc: "40 440", portRIGHT: true },
    { key: "switch1", category: "toggle_switch", name: "Master Power", boundTag: "sys/master_power", val: 1, loc: "320 440", portLEFT: true },
  ];
  const defaultEdges = [
    { key: -1, from: "tag1", to: "tank1", fromPort: "RIGHT", toPort: "LEFT", animated: true, color: "#0ea5e9" },
    { key: -2, from: "tag2", to: "switch1", fromPort: "RIGHT", toPort: "LEFT", animated: false, color: "#6366f1" }
  ];

  const [nodeDataArray, setNodeDataArray] = useState(defaultNodes);
  const [linkDataArray, setLinkDataArray] = useState(defaultEdges);

  // Aggressive Watermark Masking via CSS & DOM Observer
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const watermarks = document.querySelectorAll('a[href*="gojs.net"]');
      watermarks.forEach(wm => {
        if (wm && wm.parentElement) wm.parentElement.style.display = 'none';
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // Sync IDE settings (Grid, Snapping) to Diagram
  useEffect(() => {
    if (!diagramInstance) return;
    diagramInstance.commit(d => {
      d.grid.visible = gridVisible;
      d.toolManager.draggingTool.isGridSnapEnabled = snapEnabled;
      d.toolManager.resizingTool.isGridSnapEnabled = snapEnabled;
    }, "Update Canvas Settings");
  }, [gridVisible, snapEnabled, diagramInstance]);

  // SUSPEND EDITOR FUNCTIONS DURING SIMULATION
  useEffect(() => {
    if (!diagramRef.current) return;
    const diagram = diagramRef.current.getDiagram();
    if (!diagram) return;

    diagram.commit(d => {
      d.allowMove = !isSimulating;
      d.allowCopy = !isSimulating;
      d.allowDelete = !isSimulating;
      d.allowInsert = !isSimulating;
      d.allowLink = !isSimulating;
      d.allowRelink = !isSimulating;
      d.allowResize = !isSimulating;
      d.allowRotate = !isSimulating;
      
      if (isSimulating) {
        d.clearSelection();
        d.grid.visible = false; 
      } else {
        d.grid.visible = gridVisible;
      }
    }, "Toggle Simulation Mode");
  }, [isSimulating, gridVisible]);

  // Event Listeners & High-Performance Animation Loop
  useEffect(() => {
    if (!diagramRef.current) return;
    const diagram = diagramRef.current.getDiagram();
    if (!diagram) return;

    const selListener = (e) => {
      const sel = diagram.selection.first();
      if (sel instanceof go.Node) {
        setSelectedNodeKey(sel.data.key);
        setSelectedEdgeKey(null);
      } else if (sel instanceof go.Link) {
        setSelectedEdgeKey(sel.data.key);
        setSelectedNodeKey(null);
      } else {
        setSelectedNodeKey(null);
        setSelectedEdgeKey(null);
      }
    };
    diagram.addDiagramListener("ChangedSelection", selListener);

    let animId;
    const animateFlow = () => {
      const oldSkips = diagram.skipsUndoManager;
      diagram.skipsUndoManager = true;

      diagram.links.each(link => {
        if (link.data && link.data.animated) {
          const shape = link.elt(1);
          if (shape && shape.strokeDashArray) {
            shape.strokeDashOffset = (shape.strokeDashOffset || 0) - 1;
            if (shape.strokeDashOffset <= 0) shape.strokeDashOffset = 20;
          }
        }
      });

      diagram.nodes.each(node => {
        if (node.category === "motor_status" && node.data.val) {
          const fanShape = node.findObject("FAN_ICON");
          if (fanShape) fanShape.angle = (fanShape.angle + 5) % 360;
        }
      });

      diagram.skipsUndoManager = oldSkips;
      animId = requestAnimationFrame(animateFlow);
    };
    animateFlow();

    return () => {
      diagram.removeDiagramListener("ChangedSelection", selListener);
      cancelAnimationFrame(animId);
    };
  }, []);

  // Map user clicks back to React State
  useEffect(() => {
    if (!diagramRef.current) return;
    const diagram = diagramRef.current.getDiagram();
    if (diagram) {
       diagram.handleNodeClick = (tagKey, newValue) => writeTag(tagKey, newValue);
    }
  }, [writeTag]);

  // Sync Live Data to GoJS Diagram
  useEffect(() => {
    if (!diagramRef.current) return;
    const diagram = diagramRef.current.getDiagram();
    if (!diagram) return;

    diagram.commit((d) => {
      nodeDataArray.forEach(node => {
        const targetKey = node.tagKey || node.boundTag;
        if (targetKey && tags[targetKey] !== undefined) {
          const internalData = d.model.findNodeDataForKey(node.key);
          if (internalData && internalData.val !== tags[targetKey].value) {
            d.model.set(internalData, "val", tags[targetKey].value);
          }
        }
      });
    }, "Update Live Values");
  }, [tags, nodeDataArray]);

  const onDrop = (event) => {
    event.preventDefault();
    if (isSimulating) return; // Prevent dropping new nodes during runtime
    
    const rawData = event.dataTransfer.getData('application/scada');
    if (!rawData || !diagramRef.current) return;

    const payload = JSON.parse(rawData);
    const diagram = diagramRef.current.getDiagram();
    const point = diagram.transformViewToDoc(new go.Point(event.clientX - diagram.div.getBoundingClientRect().left, event.clientY - diagram.div.getBoundingClientRect().top));

    diagram.commit((d) => {
      const newNode = { key: `node-${Date.now()}`, category: payload.t, loc: go.Point.stringify(point), portLEFT: payload.t !== 'tagNode', portRIGHT: payload.t === 'tagNode', ...payload.props };
      d.model.addNodeData(newNode);
      setNodeDataArray([...d.model.nodeDataArray]);
    }, "Drop Node");
  };

  const selectedNodeData = selectedNodeKey ? nodeDataArray.find(n => n.key === selectedNodeKey) : null;
  const selectedEdgeData = selectedEdgeKey ? linkDataArray.find(l => l.key === selectedEdgeKey) : null;

  const updateSelectedNode = (prop, value) => {
    if (!diagramRef.current || !selectedNodeKey) return;
    const diagram = diagramRef.current.getDiagram();
    diagram.commit((d) => {
      const data = d.model.findNodeDataForKey(selectedNodeKey);
      if(data) d.model.set(data, prop, value);
      setNodeDataArray([...d.model.nodeDataArray]);
    }, "Update Node Property");
  };

  const updateSelectedEdge = (prop, value) => {
    if (!diagramRef.current || !selectedEdgeKey) return;
    const diagram = diagramRef.current.getDiagram();
    diagram.commit((d) => {
      const data = d.model.findLinkDataForKey(selectedEdgeKey);
      if(data) {
         d.model.set(data, prop, value);
         if (prop === 'animated') {
            const link = diagram.findLinkForKey(selectedEdgeKey);
            if (link) link.updateTargetBindings();
         }
      }
      setLinkDataArray([...d.model.linkDataArray]);
    }, "Update Edge Property");
  };

  const deleteSelected = () => {
    if (!diagramRef.current || isSimulating) return;
    const diagram = diagramRef.current.getDiagram();
    diagram.commit((d) => {
      diagram.selection.each(part => { 
        if (part instanceof go.Node) d.remove(part); 
        else if (part instanceof go.Link) d.remove(part);
      });
      setNodeDataArray([...d.model.nodeDataArray]);
      setLinkDataArray([...d.model.linkDataArray]);
      setSelectedNodeKey(null);
      setSelectedEdgeKey(null);
    }, "Delete Selection");
  };

  // --- Smooth Zoom Controls Wrapper ---
  const smoothZoom = (action) => {
    const diagram = diagramRef.current?.getDiagram();
    if (diagram) {
      diagram.animationManager.isEnabled = true; 
      action(diagram);
      setTimeout(() => { diagram.animationManager.isEnabled = false; }, 400); 
    }
  };

  const handleZoomIn = () => smoothZoom((d) => d.commandHandler.increaseZoom());
  const handleZoomOut = () => smoothZoom((d) => d.commandHandler.decreaseZoom());
  const handleZoomFit = () => smoothZoom((d) => d.commandHandler.zoomToFit());
  
  const handleUndo = () => diagramRef.current?.getDiagram()?.commandHandler.undo();
  const handleRedo = () => diagramRef.current?.getDiagram()?.commandHandler.redo();

  const handleCopy = () => diagramRef.current?.getDiagram()?.commandHandler.copySelection();
  const handleCut = () => diagramRef.current?.getDiagram()?.commandHandler.cutSelection();
  const handlePaste = () => diagramRef.current?.getDiagram()?.commandHandler.pasteSelection(diagramRef.current?.getDiagram()?.lastInput.documentPoint);
  
  const handleExportImage = () => {
    const diagram = diagramRef.current?.getDiagram();
    if (!diagram) return;
    const blob = diagram.makeImageData({ background: canvasBg, type: "image/png" });
    const a = document.createElement("a");
    a.href = blob;
    a.download = "scada_layout.png";
    a.click();
  };

  // Persistance Controls
  const saveProject = () => {
    if(diagramRef.current) {
       const diagram = diagramRef.current.getDiagram();
       localStorage.setItem('scada_gojs_nodes', diagram.model.toJson());
       alert("Layout and Logic successfully saved to local storage.");
    }
  };
  const loadProject = () => {
    const savedStr = localStorage.getItem('scada_gojs_nodes');
    if(savedStr && diagramRef.current) {
       const diagram = diagramRef.current.getDiagram();
       diagram.model = go.Model.fromJson(savedStr);
       setNodeDataArray([...diagram.model.nodeDataArray]);
       setLinkDataArray([...diagram.model.linkDataArray]);
    } else {
       alert("No saved layout found.");
    }
  };
  const resetCanvas = () => {
    if(window.confirm("Are you sure you want to clear the entire canvas?")) {
      setNodeDataArray([]);
      setLinkDataArray([]);
    }
  };

  const groupedTags = useMemo(() => {
    return Object.keys(tags)
      .filter(k => k.toLowerCase().includes(tagSearchQuery.toLowerCase()))
      .reduce((acc, key) => {
        const prefix = key.includes('/') ? key.split('/')[0] : 'general';
        if (!acc[prefix]) acc[prefix] = [];
        acc[prefix].push(key);
        return acc;
      }, {});
  }, [tags, tagSearchQuery]);

  const saveDevice = () => {
    editingDevice.props.forEach(p => { 
      if(!tags[p.key]) addCustomTag(p.key, p.type, p.type === 'number' ? 0 : p.type === 'boolean' ? false : ""); 
    });

    setDevices(prev => {
      let foundCategory = false;
      const updatedCategories = prev.map(cat => {
        const devExists = cat.devices.some(d => d.id === editingDevice.id);
        if (devExists) {
          foundCategory = true;
          return { ...cat, devices: cat.devices.map(d => d.id === editingDevice.id ? editingDevice : d) };
        }
        return cat;
      });

      if (!foundCategory) {
        const customCatIndex = updatedCategories.findIndex(c => c.category === "Custom Devices");
        if (customCatIndex >= 0) {
          updatedCategories[customCatIndex].devices.push(editingDevice);
        } else {
          updatedCategories.push({ category: "Custom Devices", devices: [editingDevice] });
        }
      }
      return updatedCategories;
    });
    setShowDeviceModal(false);
  };

  const toolbox = [
    { cat: "Industrial Nodes", items: [
      { t: "tank_level", l: "Liquid Tank", i: Cylinder, props: { name: "New Tank", color: "#0ea5e9", unit: "%" } },
      { t: "motor_status", l: "Motor/Fan", i: Fan, props: { name: "Exhaust Fan", color: "#f59e0b" } },
      { t: "valve_control", l: "Control Valve", i: ToggleRight, props: { name: "Main Valve", val: false } },
      { t: "progress_bar", l: "Progress Bar", i: AlignLeft, props: { name: "Progress", color: "#8b5cf6", unit: "U" } },
    ]},
    { cat: "Controls & Displays", items: [
      { t: "toggle_switch", l: "Toggle Switch", i: Power, props: { name: "Switch", val: false } },
      { t: "value_control", l: "Value Adjuster", i: SlidersHorizontal, props: { name: "Setpoint", val: 0 } },
      { t: "gauge_dial", l: "Analog Gauge", i: Gauge, props: { name: "Pressure", unit: "PSI" } },
      { t: "digital_readout", l: "LCD Display", i: Hash, props: { name: "Live Data", color: "#10b981", unit: "" } },
      { t: "temp_display", l: "Numeric Val", i: Thermometer, props: { name: "Display", color: "#0ea5e9", unit: "°C" } }
    ]},
    { cat: "Status & Alerts", items: [
      { t: "status_led", l: "Status LED", i: CircleDot, props: { name: "Status Indicator", val: false, color: "#10b981" } },
      { t: "battery_level", l: "Battery Bank", i: Battery, props: { name: "Storage Bank", val: 100 } },
      { t: "alert_banner", l: "Alert Banner", i: AlertTriangle, props: { name: "System Warning", val: false } },
      { t: "header_text", l: "Header Text", i: Type, props: { name: "System Area", color: "#cbd5e1" } }
    ]},
    { cat: "Analytics", items: [
      { t: "line_chart", l: "Line Chart", i: LineChartIcon, props: { name: "Trend View", color: "#0ea5e9" } },
      { t: "bar_chart", l: "Bar Chart", i: BarChart3, props: { name: "Volume Bar", color: "#8b5cf6" } }
    ]}
  ];

  const tagOptions = Object.keys(tags).map(t => ({ value: t, label: t }));

  const getTagBadge = (type) => {
    if (type === 'number') return <span className="bg-blue-900/40 text-blue-400 px-1.5 py-0.5 rounded text-[8px] font-bold border border-blue-800">NUM</span>;
    if (type === 'boolean') return <span className="bg-emerald-900/40 text-emerald-400 px-1.5 py-0.5 rounded text-[8px] font-bold border border-emerald-800">BOOL</span>;
    if (type === 'string') return <span className="bg-purple-900/40 text-purple-400 px-1.5 py-0.5 rounded text-[8px] font-bold border border-purple-800">STR</span>;
    if (type === 'json') return <span className="bg-amber-900/40 text-amber-400 px-1.5 py-0.5 rounded text-[8px] font-bold border border-amber-800">JSON</span>;
    return <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[8px] font-bold">UNK</span>;
  };

  return (
    <div className="flex-1 flex w-full h-full relative overflow-hidden min-h-0" style={{ backgroundColor: canvasBg }}>
      
      {/* CSS Rule to brutally override any GoJS inline watermarks */}
      <style>{`
        a[href*="gojs.net"], div[style*="z-index: 300"] > a, canvas + div {
          display: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
          visibility: hidden !important;
        }
      `}</style>

      {/* LEFT PANEL */}
      {!isSimulating && (
        <div className="w-80 bg-[#090e17] border-r border-slate-800/80 flex flex-col z-30 shadow-2xl shrink-0">
          <div className="flex border-b border-slate-800/80 shrink-0 p-2 gap-2">
            <button onClick={() => setActiveTab('devices')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'devices' ? 'bg-[#111827] text-[#0ea5e9] shadow-md border border-slate-800' : 'text-slate-500 hover:bg-[#111827]/50 border border-transparent'}`}><Database size={14}/> Explorer</button>
            <button onClick={() => setActiveTab('components')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'components' ? 'bg-[#111827] text-indigo-400 shadow-md border border-slate-800' : 'text-slate-500 hover:bg-[#111827]/50 border border-transparent'}`}><Layers size={14}/> Nodes</button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            
            {/* DEVICES TAB */}
            {activeTab === 'devices' && (
              <div className="flex flex-col gap-6">
                
                <div className="flex gap-2">
                  <button onClick={() => setShowTagModal(true)} className="flex-1 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"><Plus size={12}/> Tag</button>
                  <button onClick={() => { setEditingDevice({ id: `dev_${Date.now()}`, name: "New Device", location: "", description: "", iconKey: "Box", props: [] }); setShowDeviceModal(true); }} className="flex-1 py-2 bg-[#0ea5e9]/10 hover:bg-[#0ea5e9]/20 border border-[#0ea5e9]/30 text-[#0ea5e9] rounded text-[9px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"><Plus size={12}/> Device</button>
                </div>
                
                {/* Categorized Devices */}
                {devices.map((categoryGroup, index) => (
                  <div key={`cat-${index}`}>
                     <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 ml-1 flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-[#0ea5e9]"></div>{categoryGroup.category}
                     </div>
                     <div className="flex flex-col gap-4">
                        {categoryGroup.devices.map(dev => {
                          const DevIcon = ICON_MAP[dev.iconKey] || Box;
                          return (
                            <div key={dev.id} className="bg-[#111827] rounded-xl overflow-hidden border border-slate-800 shadow-lg">
                              <div className="p-3 flex flex-col gap-1 border-b border-slate-800/80 bg-[#0c1222]">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <DevIcon size={16} className="text-[#0ea5e9]" />
                                    <span className="text-sm font-bold text-slate-100 tracking-wide">{dev.name}</span>
                                  </div>
                                  <button onClick={() => { setEditingDevice(JSON.parse(JSON.stringify(dev))); setShowDeviceModal(true); }} className="text-slate-500 hover:text-[#0ea5e9] transition-colors p-1"><Edit3 size={14}/></button>
                                </div>
                                {dev.location && <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-7">{dev.location}</div>}
                              </div>
                              <div className="p-3 flex flex-col gap-2">
                                {dev.props.map(prop => (
                                  <div key={prop.key} draggable onDragStart={(e) => { e.dataTransfer.setData('application/scada', JSON.stringify({ t: 'tagNode', props: { tagKey: prop.key } })); }} className="px-3.5 py-3 bg-[#030712] rounded-lg border border-transparent hover:border-[#0ea5e9]/40 cursor-grab transition-all group shadow-inner flex justify-between items-center">
                                    <span className="text-[11px] font-mono text-slate-300 group-hover:text-[#0ea5e9] font-semibold tracking-wider">{prop.name}</span>
                                    {getTagBadge(tags[prop.key]?.type || prop.type)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                     </div>
                  </div>
                ))}

                {/* Categorized Unassigned Tags */}
                <div className="mt-2 pt-6 border-t border-slate-800/80">
                  <div className="flex justify-between items-end mb-4 ml-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-600"></div>Raw Data Tags</div>
                  </div>
                  <div className="relative mb-4">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                    <input type="text" placeholder="Filter tags..." value={tagSearchQuery} onChange={e => setTagSearchQuery(e.target.value)} className="w-full bg-[#111827] border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-[#0ea5e9]" />
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    {Object.keys(groupedTags).length === 0 ? (
                       <div className="text-xs text-slate-500 text-center py-4">No tags found.</div>
                    ) : (
                      Object.entries(groupedTags).map(([prefix, keys]) => (
                        <div key={prefix} className="bg-[#111827] rounded-xl overflow-hidden border border-slate-800 p-2.5">
                          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2.5 ml-1 flex items-center gap-1.5"><Database size={10}/> {prefix} Group</div>
                          <div className="flex flex-col gap-1.5">
                            {keys.map(key => {
                              const shortName = key.includes('/') ? key.split('/')[1] : key;
                              return (
                                <div key={key} draggable onDragStart={(e) => { e.dataTransfer.setData('application/scada', JSON.stringify({ t: 'tagNode', props: { tagKey: key } })); }} className="px-3 py-2 bg-[#030712] rounded border border-transparent hover:border-slate-600 cursor-grab transition-all group flex justify-between items-center shadow-inner">
                                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-slate-200 truncate">{shortName}</span>
                                  {getTagBadge(tags[key].type)}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* COMPONENTS TAB */}
            {activeTab === 'components' && (
              <div className="flex flex-col gap-2">
                <button onClick={() => setShowWidgetModal(true)} className="mb-4 w-full py-2.5 bg-indigo-500/10 border border-indigo-500/50 text-indigo-400 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-500/20 transition-colors flex items-center justify-center gap-2">
                  <Wrench size={14}/> Build Custom Node
                </button>

                {customWidgets.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-3 border-b border-indigo-900/50 pb-1.5 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div> My Widgets</h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      {customWidgets.map((tool, i) => (
                          <div key={`cw-${i}`} draggable onDragStart={(e) => e.dataTransfer.setData('application/scada', JSON.stringify({ t: tool.t, props: tool.props }))} className="flex flex-col items-center gap-2.5 p-3 bg-[#111827] rounded-xl border border-slate-800 hover:border-indigo-500/50 transition-all text-center cursor-grab shadow-lg group">
                            <Activity size={20} className="text-indigo-400 group-hover:text-indigo-300 transition-colors drop-shadow-sm" /><span className="text-[9px] font-bold tracking-wide text-slate-300 group-hover:text-white leading-tight">{tool.props.name}</span>
                          </div>
                      ))}
                    </div>
                  </div>
                )}

                {toolbox.map(group => (
                  <div key={group.cat} className="mb-6">
                    <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-800 pb-1.5 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> {group.cat}</h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      {group.items.map(tool => {
                        const Icon = tool.i;
                        return (
                          <div key={tool.t} draggable onDragStart={(e) => e.dataTransfer.setData('application/scada', JSON.stringify({ t: tool.t, props: tool.props }))} className="flex flex-col items-center gap-2.5 p-3 bg-[#111827] rounded-xl border border-slate-800 hover:border-indigo-500/50 transition-all text-center cursor-grab shadow-lg group">
                            <Icon size={20} className="text-slate-400 group-hover:text-indigo-400 transition-colors drop-shadow-sm" /><span className="text-[9px] font-bold tracking-wide text-slate-300 group-hover:text-white leading-tight">{tool.l}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CANVAS RENDERING AREA */}
      <div className="flex-1 relative w-full h-full" style={{ backgroundColor: canvasBg }} onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
        
        {/* Designer Tools (Hidden in Simulator) */}
        {!isSimulating && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 bg-[#111827]/90 backdrop-blur-md p-1.5 rounded-full border border-slate-700/80 shadow-2xl">
             <button onClick={handleUndo} className="p-2 hover:bg-slate-800 rounded-full text-slate-300 transition-colors" title="Undo"><Undo2 size={14} /></button>
             <button onClick={handleRedo} className="p-2 hover:bg-slate-800 rounded-full text-slate-300 transition-colors" title="Redo"><Redo2 size={14} /></button>
             <div className="w-px h-5 bg-slate-700 mx-1"></div>
             <button onClick={handleCut} className="p-2 hover:bg-slate-800 rounded-full text-slate-300 transition-colors" title="Cut"><Scissors size={14} /></button>
             <button onClick={handleCopy} className="p-2 hover:bg-slate-800 rounded-full text-slate-300 transition-colors" title="Copy"><Copy size={14} /></button>
             <button onClick={handlePaste} className="p-2 hover:bg-slate-800 rounded-full text-slate-300 transition-colors" title="Paste"><ClipboardPaste size={14} /></button>
             <div className="w-px h-5 bg-slate-700 mx-1"></div>
             <button onClick={() => setGridVisible(!gridVisible)} className={`p-2 rounded-full transition-colors ${gridVisible ? 'bg-[#0ea5e9]/20 text-[#0ea5e9]' : 'hover:bg-slate-800 text-slate-400'}`} title="Toggle Grid"><Grid size={14} /></button>
             <button onClick={() => setSnapEnabled(!snapEnabled)} className={`p-2 rounded-full transition-colors ${snapEnabled ? 'bg-amber-500/20 text-amber-500' : 'hover:bg-slate-800 text-slate-400'}`} title="Toggle Snap to Grid"><Magnet size={14} /></button>
             <div className="w-px h-5 bg-slate-700 mx-1"></div>
             <button onClick={saveProject} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold text-[#0ea5e9] hover:bg-slate-800 rounded-full transition-colors"><Save size={14}/> Save</button>
             <button onClick={loadProject} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold text-indigo-400 hover:bg-slate-800 rounded-full transition-colors"><FolderOpen size={14}/> Load</button>
             <button onClick={handleExportImage} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold text-emerald-400 hover:bg-slate-800 rounded-full transition-colors"><ImageIcon size={14}/> Export</button>
             <button onClick={resetCanvas} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold text-red-400 hover:bg-slate-800 rounded-full transition-colors"><Trash2 size={14}/> Clear</button>
          </div>
        )}

        {/* Runtime Alert */}
        {isSimulating && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-2.5 bg-[#0ea5e9]/10 backdrop-blur-md border border-[#0ea5e9]/50 rounded-full shadow-[0_0_20px_rgba(14,165,233,0.2)] text-[#0ea5e9] text-xs font-bold tracking-widest uppercase flex items-center gap-2 pointer-events-none">
            <Activity size={16} className="animate-pulse" /> Live HMI Runtime Active
          </div>
        )}

        {/* Floating Bottom Zoom Controls */}
        <div className="absolute bottom-6 right-6 z-50 flex flex-col gap-1.5 bg-[#111827]/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl">
           <button onClick={handleZoomIn} className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors" title="Zoom In"><ZoomIn size={18} /></button>
           <button onClick={handleZoomOut} className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors" title="Zoom Out"><ZoomOut size={18} /></button>
           <div className="w-full h-px bg-slate-700 my-0.5"></div>
           <button onClick={handleZoomFit} className="p-2 hover:bg-slate-800 rounded-lg text-[#0ea5e9] transition-colors" title="Fit to View"><Focus size={18} /></button>
        </div>

        <ReactDiagram
          ref={diagramRef}
          initDiagram={() => {
            const diag = initDiagram();
            setDiagramInstance(diag);
            return diag;
          }}
          divClassName="w-full h-full outline-none bg-transparent"
          nodeDataArray={nodeDataArray}
          linkDataArray={linkDataArray}
          onModelChange={(e) => {
             if (e.isTransactionFinished) {
               const diagram = diagramRef.current?.getDiagram();
               if(diagram) {
                 setLinkDataArray(JSON.parse(diagram.model.toJson()).linkDataArray);
                 setNodeDataArray(JSON.parse(diagram.model.toJson()).nodeDataArray);
               }
             }
          }}
        />
        
        {/* Recharts Render Surface mapped perfectly over GoJS Nodes */}
        <ChartOverlays diagram={diagramInstance} nodes={nodeDataArray} history={history} />
        
        {/* Minimap Overview */}
        {!isSimulating && diagramInstance && (
          <div className="absolute bottom-6 left-6 z-40 bg-[#111827] border border-slate-700 rounded-xl overflow-hidden shadow-2xl">
            <div className="bg-[#0c1222] border-b border-slate-800 p-1.5 flex items-center justify-center gap-1.5">
               <Map size={12} className="text-slate-400" />
               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Minimap</span>
            </div>
            <ReactOverview
              initOverview={() => {
                const $ = go.GraphObject.make;
                const overview = $(go.Overview, { contentAlignment: go.Spot.Center });
                return overview;
              }}
              observedDiagram={diagramInstance}
              divClassName="w-48 h-32 bg-[#090e17]"
            />
          </div>
        )}
      </div>

      {/* RIGHT INSPECTOR */}
      {!isSimulating && (
        <div className="w-80 bg-[#090e17] border-l border-slate-800/80 flex flex-col z-30 shadow-2xl shrink-0">
          <div className="p-4 border-b border-slate-800/80 bg-[#111827] flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5"><div className="p-1.5 bg-[#0ea5e9]/20 rounded shadow-inner"><Settings size={14} className="text-[#0ea5e9]"/></div><h2 className="text-[10px] font-bold text-slate-200 uppercase tracking-widest">Node Inspector</h2></div>
          </div>
          
          <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
            {selectedEdgeData ? (
               // WIRE INSPECTOR
               <div className="flex flex-col gap-6">
                  <div className="bg-[#111827] p-5 rounded-xl border border-slate-800 border-l-[4px] border-l-[#0ea5e9] relative shadow-lg">
                    <div className="text-[9px] font-bold text-[#0ea5e9] uppercase tracking-widest mb-4 flex items-center gap-2"><LinkIcon size={12}/> Wire Config</div>
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="text-[9px] text-slate-400 font-mono uppercase mb-2 block">Logic Color</label>
                        <CustomColorPicker value={selectedEdgeData.color || '#6366f1'} onChange={(v) => updateSelectedEdge('color', v)} />
                      </div>
                      <div className="flex items-center justify-between mt-2 p-3 bg-[#030712] rounded-lg border border-slate-800 shadow-inner">
                         <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Animate Flow</span>
                         <div onClick={() => updateSelectedEdge('animated', !selectedEdgeData.animated)} className={`w-10 h-5 rounded-full flex items-center px-1 cursor-pointer transition-colors ${selectedEdgeData.animated ? 'bg-[#0ea5e9]' : 'bg-slate-700'}`}><div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-md ${selectedEdgeData.animated ? 'translate-x-5' : ''}`}></div></div>
                      </div>
                    </div>
                  </div>
                  <button onClick={deleteSelected} className="mt-2 w-full py-3 bg-red-950/30 text-red-400 border border-red-900/50 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-900/60 transition-all shadow-md flex justify-center gap-2 items-center"><Trash size={16}/> Delete Wire</button>
               </div>
            ) : selectedNodeData ? (
              // NODE INSPECTOR
              <div className="flex flex-col gap-6">
                {selectedNodeData.category !== 'tagNode' && (
                  <>
                    <div>
                      <label className="text-[9px] text-slate-500 block mb-2 font-bold uppercase tracking-widest">Display Text</label>
                      <input type="text" value={selectedNodeData.name || ""} onChange={(e) => updateSelectedNode('name', e.target.value)} className="w-full p-3 bg-[#111827] border border-slate-700 rounded-lg text-xs font-bold text-slate-200 focus:border-[#0ea5e9] outline-none transition-all shadow-inner" />
                    </div>
                    {selectedNodeData.category !== 'header_text' && (
                      <div className="bg-[#111827] p-5 rounded-xl border border-slate-800 border-l-[4px] border-l-[#0ea5e9] relative shadow-lg">
                        <div className="text-[9px] font-bold text-[#0ea5e9] uppercase tracking-widest mb-4 flex items-center gap-2"><Database size={12}/> Tag Binding</div>
                        <CustomDropdown value={selectedNodeData.boundTag || ""} options={tagOptions} onChange={(v) => updateSelectedNode('boundTag', v)} placeholder="-- Select Data Tag --" />
                      </div>
                    )}
                    <div className="bg-[#111827] p-5 rounded-xl border border-slate-800 shadow-lg">
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Settings size={12}/> Configuration</div>
                      <div className="grid grid-cols-2 gap-4">
                          {selectedNodeData.category !== 'header_text' && (
                            <div className="flex flex-col col-span-2">
                              <label className="text-[9px] text-slate-400 font-mono uppercase mb-2">Theme Color</label>
                              <CustomColorPicker value={selectedNodeData.color || "#ffffff"} onChange={(v) => updateSelectedNode('color', v)} />
                            </div>
                          )}
                          {selectedNodeData.category !== 'header_text' && selectedNodeData.category !== 'status_led' && selectedNodeData.category !== 'motor_status' && selectedNodeData.category !== 'value_control' && selectedNodeData.category !== 'alert_banner' && (
                            <div className="flex flex-col col-span-2">
                              <label className="text-[9px] text-slate-400 font-mono uppercase mb-2">Unit Symbol</label>
                              <input type="text" value={selectedNodeData.unit || ""} onChange={(e) => updateSelectedNode('unit', e.target.value)} className="w-full p-2.5 bg-[#030712] border border-slate-700 rounded-lg text-xs text-slate-200 outline-none focus:border-[#0ea5e9] font-mono shadow-inner" />
                            </div>
                          )}
                      </div>
                    </div>
                  </>
                )}

                {selectedNodeData.category === 'tagNode' && (
                  <div className="bg-[#111827] p-5 rounded-xl border border-slate-800 border-l-[4px] border-l-amber-500 shadow-lg relative">
                    <div className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Database size={12}/> Data Source Hub</div>
                    <div>
                      <label className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-2 block">Linked Tag Key</label>
                      <CustomDropdown value={selectedNodeData.tagKey || ""} options={tagOptions} onChange={(v) => updateSelectedNode('tagKey', v)} placeholder="-- Select Tag --" />
                    </div>
                  </div>
                )}

                {selectedNodeData.category !== 'header_text' && (
                  <div className="bg-[#111827] p-5 rounded-xl border border-slate-800 border-l-[4px] border-l-emerald-500 shadow-lg relative">
                    <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2"><LinkIcon size={12}/> Wire Ports</div>
                    <div className="grid grid-cols-2 gap-3">
                      {['LEFT', 'RIGHT', 'UP', 'DOWN'].map(dir => (
                        <div key={dir} className="flex justify-between items-center bg-[#030712] p-2 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 font-bold">{dir}</span>
                          <div onClick={() => updateSelectedNode(`port${dir}`, !selectedNodeData[`port${dir}`])} className={`w-8 h-4 rounded-full flex items-center px-0.5 cursor-pointer transition-colors ${selectedNodeData[`port${dir}`] ? 'bg-emerald-500' : 'bg-slate-700'}`}><div className={`w-3 h-3 bg-white rounded-full transition-transform shadow-md ${selectedNodeData[`port${dir}`] ? 'translate-x-4' : ''}`}></div></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={deleteSelected} className="mt-2 w-full py-3 bg-red-950/30 text-red-400 border border-red-900/50 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-900/60 transition-all shadow-md flex justify-center gap-2 items-center"><Trash size={16}/> Delete Node</button>
              </div>
            ) : (
               <div className="h-full flex flex-col items-center justify-start text-center opacity-80 mt-4 gap-6">
                 
                 {/* Canvas Properties Inspector */}
                 <div className="w-full bg-[#111827] p-5 rounded-xl border border-slate-800 border-l-[4px] border-l-purple-500 shadow-lg relative text-left">
                    <div className="text-[9px] font-bold text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Settings size={12}/> Canvas Properties</div>
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="text-[9px] text-slate-400 font-mono uppercase mb-2 block">Background Color</label>
                        <CustomColorPicker value={canvasBg} onChange={setCanvasBg} />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-[#030712] rounded-lg border border-slate-800 shadow-inner">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Nodes</span>
                         <span className="text-[14px] font-mono text-white font-bold">{nodeDataArray.length}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-[#030712] rounded-lg border border-slate-800 shadow-inner">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Links</span>
                         <span className="text-[14px] font-mono text-white font-bold">{linkDataArray.length}</span>
                      </div>
                    </div>
                 </div>

                 {/* Keybinds Reference */}
                 <div className="w-full mt-auto mb-4 opacity-50">
                   <Pointer size={32} className="mb-4 text-slate-500 drop-shadow-lg mx-auto"/>
                   <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-800 pb-2 w-full">Canvas Controls</p>
                   <ul className="text-xs text-slate-400 text-left space-y-4 w-full">
                     <li className="flex justify-between items-center"><span className="flex items-center gap-2"><Move size={14}/> Move Node</span> <kbd className="bg-slate-800 px-2 py-1 rounded-md border border-slate-700 shadow-sm font-mono text-[10px]">Drag Center</kbd></li>
                     <li className="flex justify-between items-center"><span className="flex items-center gap-2"><Maximize size={14}/> Resize</span> <kbd className="bg-slate-800 px-2 py-1 rounded-md border border-slate-700 shadow-sm font-mono text-[10px]">Drag Blue Handles</kbd></li>
                     <li className="flex justify-between items-center"><span className="flex items-center gap-2"><Settings2 size={14}/> Rotate</span> <kbd className="bg-slate-800 px-2 py-1 rounded-md border border-slate-700 shadow-sm font-mono text-[10px]">Drag Yellow Ring</kbd></li>
                   </ul>
                 </div>

               </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODALS OVERLAYS */}
      {/* ========================================== */}
      {showTagModal && (
        <div className="absolute inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-[#111827] border border-slate-700 rounded-xl shadow-2xl p-6 w-96 relative">
            <button onClick={() => setShowTagModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={18}/></button>
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6"><Database size={20} className="text-amber-500"/> Create Custom Tag</h2>
            <div className="flex flex-col gap-4">
               <div><label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 block">Tag Key</label><input type="text" value={newTag.key} onChange={(e) => setNewTag({...newTag, key: e.target.value})} className="w-full p-2.5 bg-[#030712] border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-amber-500" /></div>
               <div><label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 block">Data Type</label><CustomDropdown value={newTag.type} options={[{label: "Number", value: "number"}, {label: "Boolean", value: "boolean"}, {label: "String", value: "string"}, {label: "JSON Object", value: "json"}]} onChange={(v) => setNewTag({...newTag, type: v})} /></div>
               <button onClick={() => { addCustomTag(newTag.key, newTag.type, newTag.type==='number'?0:newTag.type==='boolean'?false:""); setShowTagModal(false); }} className="mt-4 w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors">Create Tag</button>
            </div>
          </div>
        </div>
      )}

      {showWidgetModal && (
        <div className="absolute inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-[#111827] border border-slate-700 rounded-xl shadow-2xl p-6 w-[32rem] relative">
            <button onClick={() => setShowWidgetModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={18}/></button>
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6"><Wrench size={20} className="text-indigo-400"/> Build Custom Node</h2>
            <div className="flex flex-col gap-4">
               <div><label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 block">Node Name</label><input type="text" value={newWidget.name} onChange={(e) => setNewWidget({...newWidget, name: e.target.value})} className="w-full p-2.5 bg-[#030712] border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-indigo-500" /></div>
               <div>
                 <label className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 block">Base Template</label>
                 <CustomDropdown value={newWidget.template} options={[
                   {label: "Numeric Display", value: "temp_display"},
                   {label: "LCD Digital Readout", value: "digital_readout"},
                   {label: "Analog Gauge Dial", value: "gauge_dial"},
                   {label: "Tank Level", value: "tank_level"}, 
                   {label: "Progress Bar", value: "progress_bar"},
                   {label: "Motor/Fan Spin", value: "motor_status"},
                   {label: "Valve Control", value: "valve_control"},
                   {label: "Status LED", value: "status_led"},
                   {label: "Toggle Switch", value: "toggle_switch"},
                   {label: "Value Adjuster", value: "value_control"},
                   {label: "Battery Bank", value: "battery_level"},
                   {label: "Alert Banner", value: "alert_banner"}
                 ]} onChange={(v) => setNewWidget({...newWidget, template: v})} />
               </div>
               <button onClick={() => { setCustomWidgets([...customWidgets, { t: newWidget.template, props: { name: newWidget.name, color: newWidget.color, unit: newWidget.unit } }]); setShowWidgetModal(false); }} className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors">Build Node</button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Device Editor Modal */}
      {showDeviceModal && editingDevice && (
        <div className="absolute inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-xl shadow-2xl w-[40rem] relative flex flex-col max-h-[95vh] overflow-hidden">
            <div className="p-6 border-b border-slate-800 shrink-0 flex justify-between items-center bg-[#0c1222]">
              <h2 className="text-lg font-bold text-white flex items-center gap-3"><Cpu size={22} className="text-[#0ea5e9]"/> Device Builder</h2>
              <button onClick={() => setShowDeviceModal(false)} className="text-slate-500 hover:text-white transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
               {/* Device Meta */}
               <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-800">
                 <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Settings2 size={12}/> General Identity</div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="col-span-2 sm:col-span-1"><label className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1.5 block">Device Name</label><input type="text" value={editingDevice.name} onChange={(e) => setEditingDevice({...editingDevice, name: e.target.value})} className="w-full p-2.5 bg-[#030712] border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-[#0ea5e9] transition-all" /></div>
                   <div className="col-span-2 sm:col-span-1"><label className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1.5 block">Device Icon</label><CustomDropdown value={editingDevice.iconKey} options={Object.keys(ICON_MAP).map(k => ({label: k, value: k}))} onChange={(v) => setEditingDevice({...editingDevice, iconKey: v})} /></div>
                   <div className="col-span-2"><label className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1.5 block">Zone / Location</label><input type="text" value={editingDevice.location || ""} onChange={(e) => setEditingDevice({...editingDevice, location: e.target.value})} placeholder="e.g. Factory Floor, Server Room A" className="w-full p-2.5 bg-[#030712] border border-slate-700 rounded-lg text-xs text-slate-300 outline-none focus:border-[#0ea5e9] transition-all" /></div>
                   <div className="col-span-2"><label className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1.5 block">Description / Notes</label><textarea value={editingDevice.description || ""} onChange={(e) => setEditingDevice({...editingDevice, description: e.target.value})} placeholder="Maintenance notes, IP addresses, etc." className="w-full p-2.5 bg-[#030712] border border-slate-700 rounded-lg text-xs text-slate-300 outline-none focus:border-[#0ea5e9] transition-all min-h-[60px]" /></div>
                 </div>
               </div>

               {/* Device Tags / Properties */}
               <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-800">
                 <div className="flex justify-between items-center mb-4">
                   <label className="text-[10px] text-[#0ea5e9] font-bold uppercase tracking-widest flex items-center gap-2"><Database size={12}/> Data Properties (Tags)</label>
                   <button onClick={() => setEditingDevice(prev => ({...prev, props: [...prev.props, {key: `new_tag_${Date.now()}`, name: "New Prop", type: "number", unit: ""}]}))} className="text-[9px] bg-[#0ea5e9]/20 text-[#0ea5e9] px-3 py-1.5 rounded font-bold uppercase tracking-widest hover:bg-[#0ea5e9]/30 transition-colors">+ Add Tag</button>
                 </div>
                 
                 {editingDevice.props.length === 0 && <div className="text-xs text-slate-500 italic text-center py-4">No data properties assigned to this device yet.</div>}
                 
                 <div className="flex flex-col gap-3">
                   {editingDevice.props.map((prop, i) => (
                     <div key={i} className="flex flex-col gap-2 bg-[#030712] p-3 rounded-lg border border-slate-800 shadow-inner group hover:border-slate-600 transition-colors">
                       <div className="flex items-center gap-2">
                         <input type="text" value={prop.name} onChange={(e) => { const n = [...editingDevice.props]; n[i].name = e.target.value; setEditingDevice({...editingDevice, props: n}); }} className="flex-[1.5] p-2 bg-[#111827] border border-slate-700 focus:border-[#0ea5e9] rounded text-xs text-white outline-none" placeholder="Display Name" />
                         <input type="text" value={prop.key} onChange={(e) => { const n = [...editingDevice.props]; n[i].key = e.target.value; setEditingDevice({...editingDevice, props: n}); }} className="flex-[2] p-2 bg-[#111827] border border-slate-700 focus:border-[#0ea5e9] rounded text-[11px] font-mono text-slate-300 outline-none" placeholder="Backend Tag Key" />
                         <div className="w-28">
                           <select value={prop.type} onChange={(e) => { const nProps = [...editingDevice.props]; nProps[i].type = e.target.value; setEditingDevice({...editingDevice, props: nProps}); }} className="w-full p-2 bg-[#111827] border border-slate-700 rounded text-[10px] text-slate-300 outline-none cursor-pointer uppercase font-bold tracking-widest">
                             <option value="number">Num</option><option value="boolean">Bool</option><option value="string">Str</option><option value="json">JSON</option>
                           </select>
                         </div>
                         <button onClick={() => { const nProps = [...editingDevice.props]; nProps.splice(i, 1); setEditingDevice({...editingDevice, props: nProps}); }} className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"><Trash2 size={16}/></button>
                       </div>
                       
                       {/* Expanded attributes based on type */}
                       {prop.type === 'number' && (
                         <div className="flex items-center gap-2 pl-1 mt-1 opacity-60 focus-within:opacity-100 transition-opacity">
                           <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest w-16">Unit:</div>
                           <input type="text" value={prop.unit || ""} onChange={(e) => { const n = [...editingDevice.props]; n[i].unit = e.target.value; setEditingDevice({...editingDevice, props: n}); }} className="w-24 p-1.5 bg-[#111827] border border-slate-700 focus:border-[#0ea5e9] rounded text-[10px] text-slate-300 outline-none" placeholder="e.g. °C, RPM" />
                           <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-4 mr-1">Min/Max:</div>
                           <input type="number" value={prop.min || ""} onChange={(e) => { const n = [...editingDevice.props]; n[i].min = Number(e.target.value); setEditingDevice({...editingDevice, props: n}); }} className="w-16 p-1.5 bg-[#111827] border border-slate-700 focus:border-[#0ea5e9] rounded text-[10px] text-slate-300 outline-none" placeholder="0" />
                           <span className="text-slate-500">-</span>
                           <input type="number" value={prop.max || ""} onChange={(e) => { const n = [...editingDevice.props]; n[i].max = Number(e.target.value); setEditingDevice({...editingDevice, props: n}); }} className="w-16 p-1.5 bg-[#111827] border border-slate-700 focus:border-[#0ea5e9] rounded text-[10px] text-slate-300 outline-none" placeholder="100" />
                         </div>
                       )}
                     </div>
                   ))}
                 </div>
               </div>
            </div>
            
            <div className="p-6 border-t border-slate-800 bg-[#0c1222] shrink-0">
              <button onClick={saveDevice} className="w-full py-3 bg-[#0ea5e9] hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors shadow-lg">Save Device Profile</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 5. TOP LEVEL APP WRAPPER 
// ============================================================================
export default function App() {
  return (
    <SCADAContext.Provider value={{ tags, history, writeTag, addCustomTag, devices, setDevices, isSimulating }}>
      <div className="h-screen w-full flex flex-col bg-[#0b0f19]">
        
        <div className="h-16 bg-[#111827] border-b border-slate-800/80 flex justify-between items-center px-6 shrink-0 shadow-lg z-40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#0ea5e9]/10 border border-[#0ea5e9]/30 text-[#0ea5e9] shadow-inner">
              <Activity size={18} />
            </div>
            <h1 className="text-base font-bold text-slate-200 tracking-wide">Enterprise SCADA Designer</h1>
          </div>
          <button onClick={() => setIsSimulating(!isSimulating)} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-md ${isSimulating ? 'bg-[#0ea5e9]/20 border border-[#0ea5e9]/50 text-[#0ea5e9]' : 'bg-[#030712] border border-slate-700 text-slate-400 hover:text-white'}`}>
            {isSimulating ? <StopCircle size={14} className="animate-pulse"/> : <PlayCircle size={14}/>} {isSimulating ? 'Stop Simulator' : 'Start Simulator'}
          </button>
        </div>

        <DesignerCanvas />

      </div>
    </SCADAContext.Provider>
  );
}
